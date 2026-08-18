using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

public record WeeklyStats(double LearningTimeHours, int CoursesActive, int JobsWorthApplying);

public interface IStatsService
{
    Task<WeeklyStats> GetWeeklyStatsAsync(int userId);
}

public class StatsService : IStatsService
{
    private readonly ILearnerRepository _learners;
    private readonly ILearnerStudyCourseRepository _learnerStudyCourses;
    private readonly IPostRepository _posts;
    private readonly ILogger<StatsService> _logger;

    public StatsService(
        ILearnerRepository learners,
        ILearnerStudyCourseRepository learnerStudyCourses,
        IPostRepository posts,
        ILogger<StatsService> logger)
    {
        _learners = learners;
        _learnerStudyCourses = learnerStudyCourses;
        _posts = posts;
        _logger = logger;
    }

    public async Task<WeeklyStats> GetWeeklyStatsAsync(int userId)
    {
        _logger.LogInformation("Computing weekly stats for user {UserId}", userId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}; returning zero stats", userId);
            return new WeeklyStats(0, 0, 0);
        }

        var coursesActive = await _learnerStudyCourses.CountByLearnerIdAsync(learner.LearnerId);
        var learningTimeHours = await _learnerStudyCourses.SumProgressByLearnerIdAsync(learner.LearnerId);
        var jobsWorthApplying = await _posts.CountAsync();

        var stats = new WeeklyStats(Math.Round(learningTimeHours, 1), coursesActive, jobsWorthApplying);
        _logger.LogInformation("Weekly stats for user {UserId}: {LearningTimeHours}h, {CoursesActive} courses, {JobsWorthApplying} jobs",
            userId, stats.LearningTimeHours, stats.CoursesActive, stats.JobsWorthApplying);

        return stats;
    }
}