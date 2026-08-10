using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

public interface ISkillGapService
{
    Task<List<SkillGapResponse>> GetSkillGapsAsync(int userId);
}

public class SkillGapService : ISkillGapService
{
    private readonly IAppUserRepository _users;
    private readonly IRoleSkillRepository _roleSkills;
    private readonly ILearnerRepository _learners;
    private readonly ILearnerSkillRepository _learnerSkills;
    private readonly ILogger<SkillGapService> _logger;

    public SkillGapService(
        IAppUserRepository users,
        IRoleSkillRepository roleSkills,
        ILearnerRepository learners,
        ILearnerSkillRepository learnerSkills,
        ILogger<SkillGapService> logger)
    {
        _users = users;
        _roleSkills = roleSkills;
        _learners = learners;
        _learnerSkills = learnerSkills;
        _logger = logger;
    }

    public async Task<List<SkillGapResponse>> GetSkillGapsAsync(int userId)
    {
        var user = await _users.GetByIdAsync(userId);
        if (user?.TargetRole == null)
        {
            _logger.LogInformation("User {UserId} has no target role set", userId);
            return new List<SkillGapResponse>();
        }

        var roleSkills = await _roleSkills.GetByTargetRoleWithSkillAsync(user.TargetRole);

        var learner = await _learners.GetByUserIdAsync(userId);

        var learnerSkills = learner != null
            ? await _learnerSkills.GetByLearnerIdWithSkillAsync(learner.LearnerId)
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
