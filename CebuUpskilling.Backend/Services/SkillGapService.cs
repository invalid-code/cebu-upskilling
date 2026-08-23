using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

public interface ISkillGapService
{
    Task<List<SkillGapGroupDto>> GetSkillGapsAsync(int userId);
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

    public Task<List<SkillGapGroupDto>> GetSkillGapsAsync(int userId)
        => GetSkillGapGroupsAsync(userId);

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

        // A learner can target multiple roles by applying to several job
        // postings. Compute a separate set of skill gaps for each targeted role
        // (posting target role first, then the profile target role as a
        // fallback) so the gaps stay scoped per role.
        var appliedRoles = applications
            .OrderBy(a => a.AppliedAt)
            .Select(a => new
            {
                Role = !string.IsNullOrWhiteSpace(a.Post?.TargetRole) ? a.Post!.TargetRole! : a.Post?.Title,
                CompanyName = a.Post?.Company?.Name,
                PostId = a.Post?.PostId,
            })
            .Where(a => !string.IsNullOrWhiteSpace(a.Role))
            .ToList();

        var groups = new List<SkillGapGroupDto>();
        foreach (var appliedRole in appliedRoles)
        {
            var gaps = await ComputeGapsForRoleAsync(appliedRole.Role!, learnerSkillMap);
            groups.Add(new SkillGapGroupDto(
                Role: appliedRole.Role!,
                CompanyName: appliedRole.CompanyName,
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
        _logger.LogDebug("Computing skill gaps for role {TargetRole}", targetRole);

        var roleSkills = await _roleSkills.GetByTargetRoleWithSkillAsync(targetRole);

        _logger.LogDebug("Found {Count} role skills for role {TargetRole}", roleSkills.Count, targetRole);

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