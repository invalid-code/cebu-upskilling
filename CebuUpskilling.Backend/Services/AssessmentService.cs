using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Services;

public interface IAssessmentService
{
    Task<List<AssessmentResultResponse>> GetRecentResultsAsync(int userId);
    Task<RecommendedAssessmentResponse?> GetRecommendedAsync(int userId);
}

public class AssessmentService : IAssessmentService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AssessmentService> _logger;

    private static readonly Dictionary<int, string> LevelLabels = new()
    {
        { 1, "No Knowledge" },
        { 2, "Beginner" },
        { 3, "Intermediate" },
        { 4, "Advanced" },
        { 5, "Expert" },
    };

    public AssessmentService(ApplicationDbContext context, ILogger<AssessmentService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<AssessmentResultResponse>> GetRecentResultsAsync(int userId)
    {
        var learner = await _context.Learners.FirstOrDefaultAsync(l => l.UserId == userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile for user {UserId}", userId);
            return new List<AssessmentResultResponse>();
        }

        var results = (await _context.LearnerAssessments
            .Include(a => a.Skill)
            .Where(a => a.LearnerId == learner.LearnerId && a.Verified)
            .OrderByDescending(a => a.CompletedAt)
            .Select(a => new {
                a.LearnerAssessmentId,
                a.SkillId,
                SkillName = a.Skill.Name,
                a.ScoredLevel,
                a.Verified,
                a.CompletedAt
            })
            .ToListAsync())
            .Select(a => new AssessmentResultResponse(
                a.LearnerAssessmentId,
                a.SkillId,
                a.SkillName,
                a.ScoredLevel,
                LevelLabels.ContainsKey(a.ScoredLevel) ? LevelLabels[a.ScoredLevel] : $"Level {a.ScoredLevel}",
                a.Verified,
                a.CompletedAt
            )).ToList();

        _logger.LogInformation("Returning {Count} verified results for user {UserId}", results.Count, userId);
        return results;
    }

    public async Task<RecommendedAssessmentResponse?> GetRecommendedAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user?.TargetRole == null)
        {
            _logger.LogInformation("User {UserId} has no target role", userId);
            return null;
        }

        var roleSkills = await _context.RoleSkills
            .Include(rs => rs.Skill)
            .Where(rs => rs.TargetRole == user.TargetRole)
            .ToListAsync();

        var learner = await _context.Learners.FirstOrDefaultAsync(l => l.UserId == userId);
        if (learner == null) return null;

        var learnerSkills = await _context.LearnerSkills
            .Include(ls => ls.Skill)
            .Where(ls => ls.LearnerId == learner.LearnerId)
            .ToListAsync();

        var learnerSkillMap = learnerSkills.ToDictionary(ls => ls.SkillId);

        var gaps = roleSkills
            .Select(rs =>
            {
                var hasSkill = learnerSkillMap.TryGetValue(rs.SkillId, out var ls);
                var currentLevel = hasSkill ? ls!.CurrentLevel : 0;
                var gap = Math.Max(0, rs.RequiredLevel - currentLevel);
                return new { rs.Skill, rs.RequiredLevel, CurrentLevel = currentLevel, Gap = gap };
            })
            .Where(g => g.Gap > 0)
            .OrderByDescending(g => g.Gap)
            .ThenBy(g => g.Skill.Name)
            .ToList();

        if (gaps.Count == 0)
        {
            _logger.LogInformation("User {UserId} has no skill gaps for role {Role}", userId, user.TargetRole);
            return null;
        }

        var top = gaps.First();
        var result = new RecommendedAssessmentResponse(
            SkillId: top.Skill.SkillId,
            SkillName: top.Skill.Name,
            Category: top.Skill.Category,
            CurrentLevel: top.CurrentLevel,
            CurrentLevelLabel: LevelLabels.GetValueOrDefault(top.CurrentLevel, $"Level {top.CurrentLevel}"),
            TargetLevel: top.RequiredLevel,
            TargetLevelLabel: LevelLabels.GetValueOrDefault(top.RequiredLevel, $"Level {top.RequiredLevel}"),
            Gap: top.Gap
        );

        _logger.LogInformation("Recommended assessment for user {UserId}: {Skill} (gap {Gap})",
            userId, result.SkillName, result.Gap);

        return result;
    }
}
