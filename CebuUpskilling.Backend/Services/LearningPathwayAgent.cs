using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Learner-side agent that builds an ordered learning pathway from three signals:
/// the learner's skill gaps for their target role (required <c>RoleSkills</c> minus
/// current <c>LearnerSkills</c>), live job-market demand (<c>SkillMarketTrends</c>),
/// and the courses that actually teach each skill (<c>CourseSkills</c>).
/// Fully deterministic (no AI call), so it works without an API key and is unit-testable.
/// Steps are ordered by <c>gap * (1 + active postings)</c>: the biggest gaps for the
/// most-demanded skills come first; required level then breaks ties (foundations first).
/// </summary>
public interface ILearningPathwayAgent
{
    /// <summary>
    /// Builds the pathway for the learner behind <paramref name="userId"/>,
    /// or null when there is no learner profile or no target role to plan for.
    /// </summary>
    Task<LearningPathwayResponse?> GenerateAsync(int userId, CancellationToken ct = default);
}

public class LearningPathwayAgent : ILearningPathwayAgent
{
    private const int MaxCoursesPerStep = 3;

    private readonly ApplicationDbContext _db;
    private readonly IAppUserRepository _users;
    private readonly ILearnerRepository _learners;
    private readonly IRoleSkillRepository _roleSkills;
    private readonly ILearnerSkillRepository _learnerSkills;
    private readonly IApplicationRepository _applications;
    private readonly ICourseRepository _courses;
    private readonly ILearnerStudyCourseRepository _enrollments;
    private readonly ILogger<LearningPathwayAgent> _logger;

    public LearningPathwayAgent(
        ApplicationDbContext db,
        IAppUserRepository users,
        ILearnerRepository learners,
        IRoleSkillRepository roleSkills,
        ILearnerSkillRepository learnerSkills,
        IApplicationRepository applications,
        ICourseRepository courses,
        ILearnerStudyCourseRepository enrollments,
        ILogger<LearningPathwayAgent> logger)
    {
        _db = db;
        _users = users;
        _learners = learners;
        _roleSkills = roleSkills;
        _learnerSkills = learnerSkills;
        _applications = applications;
        _courses = courses;
        _enrollments = enrollments;
        _logger = logger;
    }

    public async Task<LearningPathwayResponse?> GenerateAsync(int userId, CancellationToken ct = default)
    {
        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}; no pathway generated", userId);
            return null;
        }

        var targetRole = await ResolveTargetRoleAsync(userId, learner.LearnerId);
        if (string.IsNullOrWhiteSpace(targetRole))
        {
            _logger.LogInformation("User {UserId} has no target role; no pathway generated", userId);
            return null;
        }

        var roleSkills = await _roleSkills.GetByTargetRoleWithSkillAsync(targetRole);
        var learnerSkills = await _learnerSkills.GetByLearnerIdWithSkillAsync(learner.LearnerId);
        var currentBySkill = learnerSkills.ToDictionary(ls => ls.SkillId, ls => ls.CurrentLevel);

        var totalRequired = roleSkills.Sum(rs => rs.RequiredLevel);
        var totalCurrent = roleSkills.Sum(rs => currentBySkill.GetValueOrDefault(rs.SkillId));
        // Same ratio as skill gaps, capped: exceeding requirements is still a full match.
        var matchPercent = totalRequired > 0
            ? Math.Clamp((int)Math.Round((double)totalCurrent / totalRequired * 100), 0, 100)
            : 100;

        var gaps = roleSkills
            .GroupBy(rs => rs.SkillId)
            .Select(g => new
            {
                Skill = g.First().Skill,
                RequiredLevel = g.Max(rs => rs.RequiredLevel),
                CurrentLevel = currentBySkill.GetValueOrDefault(g.Key),
            })
            .Select(x => new
            {
                x.Skill,
                x.RequiredLevel,
                x.CurrentLevel,
                Gap = Math.Max(0, x.RequiredLevel - x.CurrentLevel),
            })
            .Where(x => x.Gap > 0)
            .ToList();

        var demandBySkill = gaps.Count == 0
            ? new Dictionary<int, int>()
            : await _db.SkillMarketTrends
                .Where(t => gaps.Select(g => g.Skill.SkillId).Contains(t.SkillId))
                .ToDictionaryAsync(t => t.SkillId, t => t.ActivePostings, ct);

        var roleDemand = await _db.RoleMarketTrends
            .Where(t => t.TargetRole.ToLower() == targetRole.ToLower())
            .Select(t => t.ActivePostings)
            .FirstOrDefaultAsync(ct);

        var orderedGaps = gaps
            .Select(g => new
            {
                g.Skill,
                g.RequiredLevel,
                g.CurrentLevel,
                g.Gap,
                ActivePostings = demandBySkill.GetValueOrDefault(g.Skill.SkillId),
            })
            .Select(g => new
            {
                g.Skill,
                g.RequiredLevel,
                g.CurrentLevel,
                g.Gap,
                g.ActivePostings,
                Score = Math.Round(g.Gap * (double)(1 + g.ActivePostings), 1),
            })
            .OrderByDescending(g => g.Score)
            .ThenBy(g => g.RequiredLevel)
            .ThenBy(g => g.Skill.Name)
            .ToList();

        var allCourses = await _courses.GetAllWithLessonsAsync();
        var progressByCourse = (await _enrollments.GetByLearnerIdAsync(learner.LearnerId))
            .ToDictionary(e => e.CourseId, e => e.LastTotalProgressPercent);

        var steps = new List<PathwayStepDto>();
        var stepNumber = 1;
        foreach (var gap in orderedGaps)
        {
            var recommended = allCourses
                .Where(c => c.CourseSkills.Any(cs => cs.SkillId == gap.Skill.SkillId))
                .Where(c => progressByCourse.GetValueOrDefault(c.CourseId) < 100)
                .Select(c => new PathwayCourseDto(
                    c.CourseId,
                    c.Name,
                    c.Genre?.Name ?? "Provider",
                    c.Mode,
                    c.TechnicalLevel,
                    c.Price == null || c.Price == 0,
                    progressByCourse.ContainsKey(c.CourseId),
                    progressByCourse.GetValueOrDefault(c.CourseId)))
                .OrderBy(c => c.IsEnrolled)
                .ThenBy(c => c.TechnicalLevel)
                .ThenBy(c => c.Name)
                .Take(MaxCoursesPerStep)
                .ToList();

            steps.Add(new PathwayStepDto(
                StepNumber: stepNumber++,
                SkillId: gap.Skill.SkillId,
                SkillName: gap.Skill.Name,
                Category: gap.Skill.Category,
                CurrentLevel: gap.CurrentLevel,
                RequiredLevel: gap.RequiredLevel,
                Gap: gap.Gap,
                ActivePostings: gap.ActivePostings,
                PriorityScore: gap.Score,
                RecommendedCourses: recommended,
                SuggestedAction: BuildAction(gap.Skill.Name, recommended)));
        }

        _logger.LogInformation("Generated learning pathway for user {UserId} (role {TargetRole}): {Steps} steps, match {Match}%",
            userId, targetRole, steps.Count, matchPercent);

        return new LearningPathwayResponse(
            TargetRole: targetRole,
            MatchPercent: matchPercent,
            RoleActivePostings: roleDemand,
            TotalGaps: steps.Count,
            Steps: steps,
            GeneratedAt: DateTime.UtcNow);
    }

    private static string BuildAction(string skillName, List<PathwayCourseDto> recommended)
    {
        var first = recommended.FirstOrDefault();
        if (first == null)
            return $"No course covers {skillName} yet — take the skill assessment to verify your level";

        return first.IsEnrolled
            ? $"Continue {first.Name} ({first.ProgressPercent}%)"
            : $"Enroll in {first.Name}";
    }

    private async Task<string?> ResolveTargetRoleAsync(int userId, int learnerId)
    {
        var profileRole = (await _users.GetByIdAsync(userId))?.TargetRole?.Trim();
        if (!string.IsNullOrWhiteSpace(profileRole))
            return profileRole;

        // Same fallback as the courses page: plan for the earliest applied-for role.
        var applications = await _applications.GetByLearnerIdAsync(learnerId);
        return applications
            .OrderBy(a => a.AppliedAt)
            .Select(a => !string.IsNullOrWhiteSpace(a.Post?.TargetRole) ? a.Post!.TargetRole!.Trim() : a.Post?.Title?.Trim())
            .FirstOrDefault(r => !string.IsNullOrWhiteSpace(r));
    }
}
