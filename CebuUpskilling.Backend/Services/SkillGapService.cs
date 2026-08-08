using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Services;

public interface ISkillGapService
{
    Task<List<SkillGapResponse>> GetSkillGapsAsync(int userId);
}

public class SkillGapService : ISkillGapService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SkillGapService> _logger;

    public SkillGapService(ApplicationDbContext context, ILogger<SkillGapService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<SkillGapResponse>> GetSkillGapsAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user?.TargetRole == null)
        {
            _logger.LogInformation("User {UserId} has no target role set", userId);
            return new List<SkillGapResponse>();
        }

        var roleSkills = await _context.RoleSkills
            .Include(rs => rs.Skill)
            .Where(rs => rs.TargetRole == user.TargetRole)
            .ToListAsync();

        var learner = await _context.Learners.FirstOrDefaultAsync(l => l.UserId == userId);

        var learnerSkills = learner != null
            ? await _context.LearnerSkills
                .Include(ls => ls.Skill)
                .Where(ls => ls.LearnerId == learner.LearnerId)
                .ToListAsync()
            : new List<LearnerSkill>();

        var learnerSkillMap = learnerSkills.ToDictionary(ls => ls.SkillId);

        var gaps = roleSkills.Select(rs =>
        {
            var hasSkill = learnerSkillMap.TryGetValue(rs.SkillId, out var learnerSkill);
            var currentLevel = hasSkill ? learnerSkill!.CurrentLevel : 0;
            var verified = hasSkill && learnerSkill!.Verified;
            var gap = Math.Max(0, rs.RequiredLevel - currentLevel);

            return new SkillGapResponse(
                SkillId: rs.SkillId,
                SkillName: rs.Skill.Name,
                Category: rs.Skill.Category,
                RequiredLevel: rs.RequiredLevel,
                CurrentLevel: currentLevel,
                Gap: gap,
                Verified: verified
            );
        })
        .OrderByDescending(g => g.Gap)
        .ThenBy(g => g.SkillName)
        .ToList();

        _logger.LogInformation("Computed {Count} skill gaps for user {UserId} (role: {Role})",
            gaps.Count, userId, user.TargetRole);

        return gaps;
    }
}
