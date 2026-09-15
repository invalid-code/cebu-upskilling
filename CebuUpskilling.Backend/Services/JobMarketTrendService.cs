using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Services;

public interface IJobMarketTrendService
{
    /// <summary>Recomputes skill demand rows for the given skills from current job posts.</summary>
    Task RefreshSkillsAsync(IEnumerable<int> skillIds, CancellationToken cancellationToken = default);

    /// <summary>Recomputes role demand rows for the given target roles from current job posts.</summary>
    Task RefreshRolesAsync(IEnumerable<string> targetRoles, CancellationToken cancellationToken = default);

    /// <summary>Recomputes every trend row (backfill/repair).</summary>
    Task RefreshAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Reads the current trends, most-demanded first.</summary>
    Task<MarketTrendsResponse> GetTrendsAsync(int top, CancellationToken cancellationToken = default);
}

public class JobMarketTrendService : IJobMarketTrendService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<JobMarketTrendService> _logger;

    public JobMarketTrendService(ApplicationDbContext db, ILogger<JobMarketTrendService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task RefreshSkillsAsync(IEnumerable<int> skillIds, CancellationToken cancellationToken = default)
    {
        var ids = skillIds.Where(id => id > 0).Distinct().ToList();
        if (ids.Count == 0) return;

        var aggregates = await _db.PostSkills
            .Where(ps => ids.Contains(ps.SkillId))
            .GroupBy(ps => ps.SkillId)
            .Select(g => new
            {
                SkillId = g.Key,
                Active = g.Count(ps => ps.Post.IsActive),
                Total = g.Count(),
                Avg = g.Average(ps => (double)ps.RequiredLevel),
            })
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var existing = await _db.SkillMarketTrends
            .Where(t => ids.Contains(t.SkillId))
            .ToDictionaryAsync(t => t.SkillId, cancellationToken);

        var found = new HashSet<int>();
        foreach (var agg in aggregates)
        {
            found.Add(agg.SkillId);
            if (existing.TryGetValue(agg.SkillId, out var row))
            {
                row.ActivePostings = agg.Active;
                row.TotalPostings = agg.Total;
                row.AvgRequiredLevel = Math.Round(agg.Avg, 1);
                row.UpdatedAt = now;
            }
            else
            {
                _db.SkillMarketTrends.Add(new SkillMarketTrend
                {
                    SkillId = agg.SkillId,
                    ActivePostings = agg.Active,
                    TotalPostings = agg.Total,
                    AvgRequiredLevel = Math.Round(agg.Avg, 1),
                    UpdatedAt = now,
                });
            }
        }

        // Prune rows whose skill is no longer required by any post.
        foreach (var id in ids.Where(id => !found.Contains(id)))
        {
            if (existing.TryGetValue(id, out var stale))
                _db.SkillMarketTrends.Remove(stale);
        }

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Refreshed skill market trends for {Count} skills", ids.Count);
    }

    public async Task RefreshRolesAsync(IEnumerable<string> targetRoles, CancellationToken cancellationToken = default)
    {
        var roles = targetRoles
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Select(r => r.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (roles.Count == 0) return;

        var lowered = roles.Select(r => r.ToLower()).ToList();
        var posts = await _db.Posts
            .Where(p => lowered.Contains(p.TargetRole.ToLower()))
            .Select(p => new { p.TargetRole, p.IsActive })
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var existing = await _db.RoleMarketTrends
            .Where(t => lowered.Contains(t.TargetRole.ToLower()))
            .ToDictionaryAsync(t => t.TargetRole.ToLower(), cancellationToken);

        foreach (var role in roles)
        {
            var matches = posts.Where(p => string.Equals(p.TargetRole, role, StringComparison.OrdinalIgnoreCase)).ToList();
            var key = role.ToLower();

            if (matches.Count == 0)
            {
                // Prune rows whose role no longer has any post.
                if (existing.TryGetValue(key, out var stale))
                    _db.RoleMarketTrends.Remove(stale);
                continue;
            }

            if (!existing.TryGetValue(key, out var row))
            {
                row = new RoleMarketTrend { TargetRole = role };
                _db.RoleMarketTrends.Add(row);
                existing[key] = row;
            }

            row.ActivePostings = matches.Count(p => p.IsActive);
            row.TotalPostings = matches.Count;
            row.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Refreshed role market trends for {Count} roles", roles.Count);
    }

    public async Task RefreshAllAsync(CancellationToken cancellationToken = default)
    {
        var skillIds = await _db.PostSkills
            .Select(ps => ps.SkillId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var roles = await _db.Posts
            .Select(p => p.TargetRole)
            .Distinct()
            .ToListAsync(cancellationToken);

        await RefreshSkillsAsync(skillIds, cancellationToken);
        await RefreshRolesAsync(roles, cancellationToken);

        // Prune orphan rows left behind by deleted posts/skills.
        var staleSkills = await _db.SkillMarketTrends
            .Where(t => !skillIds.Contains(t.SkillId))
            .ToListAsync(cancellationToken);
        _db.SkillMarketTrends.RemoveRange(staleSkills);

        var loweredRoles = roles.Select(r => r.ToLower()).ToList();
        var staleRoles = await _db.RoleMarketTrends
            .Where(t => !loweredRoles.Contains(t.TargetRole.ToLower()))
            .ToListAsync(cancellationToken);
        _db.RoleMarketTrends.RemoveRange(staleRoles);

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Refreshed all job market trends");
    }

    public async Task<MarketTrendsResponse> GetTrendsAsync(int top, CancellationToken cancellationToken = default)
    {
        top = Math.Clamp(top, 1, 500);

        var skills = await _db.SkillMarketTrends
            .Include(t => t.Skill)
            .OrderByDescending(t => t.ActivePostings)
            .ThenBy(t => t.Skill.Name)
            .Take(top)
            .Select(t => new SkillTrendDto(
                t.SkillId,
                t.Skill.Name,
                t.Skill.Category,
                t.ActivePostings,
                t.TotalPostings,
                t.AvgRequiredLevel,
                t.UpdatedAt))
            .ToListAsync(cancellationToken);

        var roles = await _db.RoleMarketTrends
            .OrderByDescending(t => t.ActivePostings)
            .ThenBy(t => t.TargetRole)
            .Take(top)
            .Select(t => new RoleTrendDto(
                t.TargetRole,
                t.ActivePostings,
                t.TotalPostings,
                t.UpdatedAt))
            .ToListAsync(cancellationToken);

        return new MarketTrendsResponse(skills, roles);
    }
}
