using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Services;

public record EnrollmentSummary(Guid CourseId, string CourseName, DateTime? Started, int LastTotalProgressPercent);

public enum EnrollFailure
{
    NoLearnerProfile,
    CourseNotFound,
    AlreadyEnrolled,
}

public record EnrollOutcome(bool Success, EnrollFailure? Failure = null, Guid? CourseId = null, DateTime? Started = null);

public interface IEnrollmentsService
{
    Task<List<EnrollmentSummary>?> GetMyEnrollmentsAsync(Guid userId);
    Task<EnrollOutcome> EnrollAsync(Guid userId, Guid courseId);
}

public class EnrollmentsService : IEnrollmentsService
{
    private readonly ILearnerRepository _learners;
    private readonly ICourseRepository _courses;
    private readonly ILearnerStudyCourseRepository _learnerStudyCourses;
    private readonly IAnalyticsService _analytics;
    private readonly ILogger<EnrollmentsService> _logger;

    public EnrollmentsService(
        ILearnerRepository learners,
        ICourseRepository courses,
        ILearnerStudyCourseRepository learnerStudyCourses,
        ILogger<EnrollmentsService> logger,
        IAnalyticsService? analyticsService = null)
    {
        _learners = learners;
        _courses = courses;
        _learnerStudyCourses = learnerStudyCourses;
        _analytics = analyticsService ?? new NoOpAnalyticsService();
        _logger = logger;
    }

    public async Task<List<EnrollmentSummary>?> GetMyEnrollmentsAsync(Guid userId)
    {
        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}", userId);
            return null;
        }

        var enrollments = await _learnerStudyCourses.GetByLearnerIdAsync(learner.LearnerId);

        return enrollments
            .Select(e => new EnrollmentSummary(e.CourseId, e.Course.Name, e.Started, e.LastTotalProgressPercent))
            .ToList();
    }

    public async Task<EnrollOutcome> EnrollAsync(Guid userId, Guid courseId)
    {
        _logger.LogInformation("User {UserId} attempting to enroll in course {CourseId}", userId, courseId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogWarning("No learner profile found for user {UserId}", userId);
            return new EnrollOutcome(false, EnrollFailure.NoLearnerProfile);
        }

        var course = await _courses.GetByIdAsync(courseId);
        if (course == null)
        {
            _logger.LogWarning("Course {CourseId} not found", courseId);
            return new EnrollOutcome(false, EnrollFailure.CourseNotFound);
        }

        var existing = await _learnerStudyCourses.GetByLearnerAndCourseAsync(learner.LearnerId, courseId);
        if (existing != null)
        {
            _logger.LogInformation("User {UserId} already enrolled in course {CourseId}", userId, courseId);
            return new EnrollOutcome(false, EnrollFailure.AlreadyEnrolled);
        }

        var enrollment = new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = courseId,
            Started = DateTime.UtcNow,
            LastTotalProgressPercent = 0,
        };

        await _learnerStudyCourses.AddAsync(enrollment);
        try
        {
            await _learnerStudyCourses.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            // Lost a concurrent double-enroll race: the composite PK rejected
            // the second insert. The learner is already enrolled.
            _logger.LogInformation(ex, "User {UserId} concurrent enroll in course {CourseId}; already enrolled", userId, courseId);
            return new EnrollOutcome(false, EnrollFailure.AlreadyEnrolled);
        }

        _logger.LogInformation("User {UserId} enrolled in course {CourseId}", userId, courseId);
        await _analytics.TrackAsync("enrollment_completed", userId, new Dictionary<string, object?>
        {
            ["courseId"] = courseId,
        });
        return new EnrollOutcome(true, CourseId: courseId, Started: enrollment.Started);
    }
}