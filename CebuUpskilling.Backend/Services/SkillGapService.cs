using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

public interface ISkillGapService
{
    Task<List<SkillGapResponse>> GetSkillGapsAsync(int userId);
    Task<List<SkillGapGroupDto>> GetSkillGapGroupsAsync(int userId);
}

public class SkillGapService : ISkillGapService
{
    private readonly IAppUserRepository _users;
    private readonly IRoleSkillRepository _roleSkills;
    private readonly ILearnerRepository _learners;
    private readonly ILearnerSkillRepository _learnerSkills;
    private readonly IApplicationRepository _applications;
    private readonly ILogger<SkillGapService> _logger;

    public SkillGapService(
        IAppUserRepository users,
        IRoleSkillRepository roleSkills,
        ILearnerRepository learners,
        ILearnerSkillRepository learnerSkills,
        IApplicationRepository applications,
        ILogger<SkillGapService> logger)
    {
        _users = users;
        _roleSkills = roleSkills;
        _learners = learners;
        _learnerSkills = learnerSkills;
        _applications = applications;
        _logger = logger;
    }

    public async Task<List<SkillGapResponse>> GetSkillGapsAsync(int userId)
    {
        var user = await _users.GetByIdAsync(userId);

        var learner = await _learners.GetByUserIdAsync(userId);
        var learnerSkillMap = learner != null
            ? (await _learnerSkills.GetByLearnerIdWithSkillAsync(learner.LearnerId)).ToDictionary(ls => ls.SkillId)
            : new Dictionary<int, LearnerSkill>();

        var appliedRole = learner != null
            ? (await _applications.GetByLearnerIdAsync(learner.LearnerId))
                .Where(a => !string.IsNullOrWhiteSpace(a.Post?.TargetRole))
                .OrderByDescending(a => a.AppliedAt)
                .Select(a => a.Post!.TargetRole!)
                .FirstOrDefault()
            : null;

        var role = appliedRole ?? user?.TargetRole;
        if (role == null)
        {
            _logger.LogInformation("User {UserId} has no target role set", userId);
            return new List<SkillGapResponse>();
        }

        var gaps = await ComputeGapsForRoleAsync(role, learnerSkillMap);

        _logger.LogInformation("Computed {Count} skill gaps for user {UserId} (role: {Role})",
            gaps.Count, userId, role);

        return gaps;
    }

    public async Task<List<SkillGapGroupDto>> GetSkillGapGroupsAsync(int userId)
    {
        var user = await _users.GetByIdAsync(userId);

        var learner = await _learners.GetByUserIdAsync(userId);
        var learnerSkillMap = learner != null
            ? (await _learnerSkills.GetByLearnerIdWithSkillAsync(learner.LearnerId)).ToDictionary(ls => ls.SkillId)
            : new Dictionary<int, LearnerSkill>();

        var applications = learner != null
            ? await _applications.GetByLearnerIdAsync(learner.LearnerId)
            : new List<Application>();

        var appliedRoles = applications
            .Where(a => !string.IsNullOrWhiteSpace(a.Post?.TargetRole))
            .OrderBy(a => a.AppliedAt)
            .Select(a => new { Role = a.Post!.TargetRole!, a.Post.Company?.Name, a.Post.PostId })
            .ToList();

        var groups = new List<SkillGapGroupDto>();
        foreach (var appliedRole in appliedRoles)
        {
            var gaps = await ComputeGapsForRoleAsync(appliedRole.Role, learnerSkillMap);
            groups.Add(new SkillGapGroupDto(
                Role: appliedRole.Role,
                CompanyName: appliedRole.Name,
                PostId: appliedRole.PostId,
                MatchPercent: ComputeMatchPercent(gaps),
                Gaps: gaps
            ));
        }

        if (groups.Count == 0 && user?.TargetRole != null)
        {
            var fallbackGaps = await ComputeGapsForRoleAsync(user.TargetRole, learnerSkillMap);
            groups.Add(new SkillGapGroupDto(
                Role: user.TargetRole,
                CompanyName: null,
                PostId: null,
                MatchPercent: ComputeMatchPercent(fallbackGaps),
                Gaps: fallbackGaps
            ));
        }

        _logger.LogInformation("Computed {Count} skill gap groups for user {UserId}", groups.Count, userId);
        return groups;
    }

    private async Task<List<SkillGapResponse>> ComputeGapsForRoleAsync(
        string targetRole,
        Dictionary<int, LearnerSkill> learnerSkillMap)
    {
        var roleSkills = await _roleSkills.GetByTargetRoleWithSkillAsync(targetRole);

        return roleSkills
            .Select(rs =>
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
    }

    private static int ComputeMatchPercent(List<SkillGapResponse> gaps)
    {
        var totalRequired = gaps.Sum(g => g.RequiredLevel);
        var totalCurrent = gaps.Sum(g => g.CurrentLevel);
        return totalRequired > 0 ? (int)Math.Round((double)totalCurrent / totalRequired * 100) : 0;
    }
}