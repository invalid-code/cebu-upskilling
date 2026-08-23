using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

public interface ICoursesPageService
{
    Task<CoursesPageResponse?> GetCoursesPageAsync(int userId, string? category = null);
    Task<CourseDetailDto?> GetCourseDetailAsync(int userId, int courseId);
}

public class CoursesPageService : ICoursesPageService
{
    private readonly IAppUserRepository _users;
    private readonly ILearnerRepository _learners;
    private readonly ICourseRepository _courses;
    private readonly ILearnerStudyCourseRepository _learnerStudyCourses;
    private readonly IRoleSkillRepository _roleSkills;
    private readonly ILearnerSkillRepository _learnerSkills;
    private readonly IApplicationRepository _applications;
    private readonly ILogger<CoursesPageService> _logger;

    public CoursesPageService(
        IAppUserRepository users,
        ILearnerRepository learners,
        ICourseRepository courses,
        ILearnerStudyCourseRepository learnerStudyCourses,
        IRoleSkillRepository roleSkills,
        ILearnerSkillRepository learnerSkills,
        IApplicationRepository applications,
        ILogger<CoursesPageService> logger)
    {
        _users = users;
        _learners = learners;
        _courses = courses;
        _learnerStudyCourses = learnerStudyCourses;
        _roleSkills = roleSkills;
        _learnerSkills = learnerSkills;
        _applications = applications;
        _logger = logger;
    }

    public async Task<CoursesPageResponse?> GetCoursesPageAsync(int userId, string? category = null)
    {
        _logger.LogDebug("Getting courses page for user {UserId}, category {Category}", userId, category);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}", userId);
            return null;
        }

        var user = await _users.GetByIdAsync(userId);

        var enrollments = await _learnerStudyCourses.GetByLearnerIdWithCourseAsync(learner.LearnerId);

        var enrolledCourses = enrollments.Select(e => new EnrollmentDto(
            CourseId: e.CourseId,
            CourseName: e.Course.Name,
            Started: e.Started,
            ProgressPercent: e.LastTotalProgressPercent,
            CurrentModule: GetCurrentModule(e.Course.Modules.Count, e.LastTotalProgressPercent),
            TotalModules: e.Course.Modules.Count,
            TechnicalLevel: e.Course.TechnicalLevel
        )).ToList();

        var coursesInProgress = enrolledCourses.Count(e => e.ProgressPercent < 100);
        var certificatesEarned = enrolledCourses.Count(e => e.ProgressPercent >= 100);
        var dayStreak = CalculateDayStreak(enrollments);

        var allCourses = await _courses.GetAllWithLessonsAsync();

        var learnerSkills = await _learnerSkills.GetByLearnerIdWithSkillAsync(learner.LearnerId);
        var learnerSkillNames = learnerSkills
            .Select(ls => ls.Skill.Name?.Trim())
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Select(n => n!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Resolve the role(s) that should drive course recommendations. The
        // learner's own profile target role takes priority; when they have not
        // set one yet, fall back to the target roles required by the jobs they
        // have applied for.
        var effectiveRoles = await ResolveTargetRolesAsync(user, learner.LearnerId);
        var roleSkills = new List<RoleSkill>();
        foreach (var role in effectiveRoles)
        {
            roleSkills.AddRange(await _roleSkills.GetByTargetRoleWithSkillAsync(role));
        }

        var availableCategories = roleSkills
            .Select(rs => rs.Skill.Category)
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c!)
            .Distinct()
            .OrderBy(c => c)
            .ToList();

        var targetRole = effectiveRoles.Count > 0 ? effectiveRoles[0] : null;

        var enrolledCourseIds = enrollments.Select(e => e.CourseId).ToHashSet();

        var recommendedCourses = allCourses
            .Where(c => !enrolledCourseIds.Contains(c.CourseId))
            .Select(c => MapToRecommendedDto(c, learnerSkillNames, effectiveRoles, roleSkills))
            .Where(c => category == null || category == "All" || c.SkillCategory == category)
            .OrderByDescending(c => c.IsRecommended)
            .ThenByDescending(c => c.UnlocksJobsCount ?? 0)
            .ThenBy(c => c.Name)
            .ToList();

        _logger.LogInformation("Courses page for user {UserId}: target role {TargetRole}, {EnrolledCount} enrolled, {RecommendedCount} recommended, {CoursesInProgress} in progress, {CertificatesEarned} certificates",
            userId, targetRole, enrolledCourses.Count, recommendedCourses.Count, coursesInProgress, certificatesEarned);

        return new CoursesPageResponse(
            EnrolledCourses: enrolledCourses,
            RecommendedCourses: recommendedCourses,
            DayStreak: dayStreak,
            CoursesInProgress: coursesInProgress,
            CertificatesEarned: certificatesEarned,
            TargetRole: targetRole,
            AvailableCategories: availableCategories
        );
    }

    private async Task<List<string>> ResolveTargetRolesAsync(AppUser? user, int learnerId)
    {
        var profileRole = user?.TargetRole?.Trim();
        if (!string.IsNullOrWhiteSpace(profileRole))
        {
            return new List<string> { profileRole! };
        }

        var applications = await _applications.GetByLearnerIdAsync(learnerId);
        return applications
            .Select(a => !string.IsNullOrWhiteSpace(a.Post?.TargetRole) ? a.Post!.TargetRole! : a.Post?.Title)
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Select(r => r!)
            .Distinct()
            .ToList();
    }

    private static string? GetCurrentModule(int lessonCount, int progressPercent)
    {
        if (lessonCount == 0) return null;
        var currentLesson = (int)Math.Ceiling(progressPercent / 100.0 * lessonCount);
        currentLesson = Math.Max(1, Math.Min(currentLesson, lessonCount));
        return $"Module {currentLesson}";
    }

    private static int CalculateDayStreak(List<Entities.LearnerStudyCourse> enrollments)
    {
        if (!enrollments.Any()) return 0;

        var lastOnline = enrollments
            .Where(e => e.LastOnline.HasValue)
            .MaxBy(e => e.LastOnline)?.LastOnline;

        if (lastOnline == null) return 0;

        var daysSinceLastOnline = (DateTime.UtcNow - lastOnline.Value).Days;
        return daysSinceLastOnline <= 1 ? Math.Max(1, 7 - daysSinceLastOnline) : 0;
    }

    private static RecommendedCourseDto MapToRecommendedDto(
        Entities.Course course,
        HashSet<string> learnerSkillNames,
        List<string> effectiveRoles,
        List<RoleSkill> roleSkills)
    {
        string? skillCategory = null;
        string? reason = null;
        bool isRecommended;

        if (effectiveRoles.Count > 0)
        {
            // Only recommend courses that map to a skill the resolved target
            // role actually requires, and surface that skill's category so the
            // UI can filter by it.
            var matchedRoleSkill = MatchRoleSkill(course, roleSkills);
            if (matchedRoleSkill != null)
            {
                skillCategory = matchedRoleSkill.Skill.Category;
                reason = $"Recommended for {matchedRoleSkill.Skill.Name}";
                isRecommended = true;
            }
            else
            {
                isRecommended = false;
            }
        }
        else
        {
            // No target role and no applied jobs: fall back to recommending
            // courses that match the learner's own declared skills.
            var matchedSkill = MatchSkill(course, learnerSkillNames);
            isRecommended = matchedSkill != null;
            reason = matchedSkill != null ? $"Matches {matchedSkill}" : null;
        }

        var unlocksJobs = isRecommended ? (int?)null : null;

        return new RecommendedCourseDto(
            CourseId: course.CourseId,
            Name: course.Name,
            Provider: course.Genre?.Name ?? "Provider",
            Description: course.Description,
            Price: course.Price,
            IsFree: course.Price == null || course.Price == 0,
            Mode: course.Mode,
            TechnicalLevel: course.TechnicalLevel,
            LessonCount: course.Lessons.Count,
            Category: course.Genre?.SubDiscipline?.Name,
            IsEnrolled: false,
            ProgressPercent: 0,
            IsCompleted: false,
            IsRecommended: isRecommended,
            RecommendedReason: reason,
            UnlocksJobsCount: unlocksJobs,
            SkillCategory: skillCategory
        );
    }

    private static RoleSkill? MatchRoleSkill(Entities.Course course, List<RoleSkill> roleSkills)
    {
        var haystack = new[] { course.Name, course.Genre?.Name }
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t!.ToLowerInvariant())
            .ToList();

        return roleSkills
            .Where(rs => !string.IsNullOrWhiteSpace(rs.Skill.Name))
            .OrderByDescending(rs => rs.Skill.Name.Length)
            .FirstOrDefault(rs => haystack.Any(h => h.Contains(rs.Skill.Name.ToLowerInvariant())));
    }

    private static string? MatchSkill(Entities.Course course, HashSet<string> learnerSkillNames)
    {
        var haystack = new[] { course.Name, course.Genre?.Name }
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t!.ToLowerInvariant())
            .ToList();

        return learnerSkillNames
            .OrderByDescending(s => s.Length)
            .FirstOrDefault(s => haystack.Any(h => h.Contains(s.ToLowerInvariant())));
    }

    public async Task<CourseDetailDto?> GetCourseDetailAsync(int userId, int courseId)
    {
        _logger.LogDebug("Getting course detail for user {UserId}, course {CourseId}", userId, courseId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogWarning("No learner profile found for user {UserId} when viewing course {CourseId}", userId, courseId);
            return null;
        }

        var course = await _courses.GetWithModulesAsync(courseId);
        if (course == null)
        {
            _logger.LogWarning("Course {CourseId} not found", courseId);
            return null;
        }

        var enrollment = await _learnerStudyCourses.GetByLearnerAndCourseAsync(learner.LearnerId, courseId);
        var isEnrolled = enrollment != null;
        var progressPercent = enrollment?.LastTotalProgressPercent ?? 0;

        var totalModules = course.Modules.Count;
        var completedModules = isEnrolled
            ? (int)Math.Ceiling(progressPercent / 100.0 * totalModules)
            : 0;

        var modules = course.Modules
            .Select((module, index) => new ModuleSummaryDto(
                ModuleNumber: index + 1,
                Name: module.Name,
                Description: module.Description,
                LessonCount: module.Lessons.Count,
                Lessons: module.Lessons
                    .OrderBy(l => l.LessonId)
                    .Select(l => new LessonSummaryDto(l.LessonId, l.Name, l.Description))
                    .ToList()
            ))
            .ToList();

        return new CourseDetailDto(
            CourseId: course.CourseId,
            Name: course.Name,
            Provider: course.Genre?.Name ?? "Provider",
            Description: course.Description,
            TechnicalLevel: course.TechnicalLevel,
            Mode: course.Mode,
            LessonCount: course.Lessons.Count,
            Category: course.Genre?.SubDiscipline?.Name,
            IsEnrolled: isEnrolled,
            ProgressPercent: progressPercent,
            TotalModules: totalModules,
            CompletedModules: completedModules,
            Modules: modules
        );
    }
}
