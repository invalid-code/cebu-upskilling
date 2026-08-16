using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

public record EnrollmentSummary(int CourseId, string CourseName, DateTime? Started, int LastTotalProgressPercent);

public enum EnrollFailure
{
    NoLearnerProfile,
    CourseNotFound,
    AlreadyEnrolled,
}

public record EnrollOutcome(bool Success, EnrollFailure? Failure = null, int? CourseId = null, DateTime? Started = null);

public interface IEnrollmentsService
{
    Task<List<EnrollmentSummary>?> GetMyEnrollmentsAsync(int userId);
    Task<EnrollOutcome> EnrollAsync(int userId, int courseId);
}

public class EnrollmentsService : IEnrollmentsService
{
    private readonly ILearnerRepository _learners;
    private readonly ICourseRepository _courses;
    private readonly ILearnerStudyCourseRepository _learnerStudyCourses;
    private readonly ILogger<EnrollmentsService> _logger;

    public EnrollmentsService(
        ILearnerRepository learners,
        ICourseRepository courses,
        ILearnerStudyCourseRepository learnerStudyCourses,
        ILogger<EnrollmentsService> logger)
    {
        _learners = learners;
        _courses = courses;
        _learnerStudyCourses = learnerStudyCourses;
        _logger = logger;
    }

    public async Task<List<EnrollmentSummary>?> GetMyEnrollmentsAsync(int userId)
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

    public async Task<EnrollOutcome> EnrollAsync(int userId, int courseId)
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
        await _learnerStudyCourses.SaveChangesAsync();

        _logger.LogInformation("User {UserId} enrolled in course {CourseId}", userId, courseId);
        return new EnrollOutcome(true, CourseId: courseId, Started: enrollment.Started);
    }
}