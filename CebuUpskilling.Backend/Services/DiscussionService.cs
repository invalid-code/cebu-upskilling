using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

public interface IDiscussionService
{
    Task<LessonDiscussionResponse?> GetLessonDiscussionAsync(int userId, int lessonId, CancellationToken cancellationToken = default);
    Task<DiscussionPostDto?> CreatePostAsync(int userId, int lessonId, string content, CancellationToken cancellationToken = default);
}

public class DiscussionService : IDiscussionService
{
    private readonly ILearnerRepository _learners;
    private readonly ILessonRepository _lessons;
    private readonly ILearnerStudyCourseRepository _learnerStudyCourses;
    private readonly IDiscussionPostRepository _posts;
    private readonly ILogger<DiscussionService> _logger;

    public DiscussionService(
        ILearnerRepository learners,
        ILessonRepository lessons,
        ILearnerStudyCourseRepository learnerStudyCourses,
        IDiscussionPostRepository posts,
        ILogger<DiscussionService> logger)
    {
        _learners = learners;
        _lessons = lessons;
        _learnerStudyCourses = learnerStudyCourses;
        _posts = posts;
        _logger = logger;
    }

    public async Task<LessonDiscussionResponse?> GetLessonDiscussionAsync(int userId, int lessonId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Getting discussion for user {UserId}, lesson {LessonId}", userId, lessonId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}", userId);
            return null;
        }

        var lesson = await _lessons.GetByIdAsync(lessonId);
        if (lesson == null)
        {
            _logger.LogWarning("Lesson {LessonId} not found", lessonId);
            return null;
        }

        var enrollment = await _learnerStudyCourses.GetByLearnerAndCourseAsync(learner.LearnerId, lesson.CourseId);
        if (enrollment == null)
        {
            _logger.LogInformation("No enrollment found for user {UserId} in course {CourseId}", userId, lesson.CourseId);
            return null;
        }

        var posts = await _posts.GetByLessonAsync(lessonId);
        return new LessonDiscussionResponse(
            LessonId: lessonId,
            Posts: posts.Select(p => MapToDto(p, learner.LearnerId)).ToList()
        );
    }

    public async Task<DiscussionPostDto?> CreatePostAsync(int userId, int lessonId, string content, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Creating discussion post for user {UserId}, lesson {LessonId}", userId, lessonId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}", userId);
            return null;
        }

        var lesson = await _lessons.GetByIdAsync(lessonId);
        if (lesson == null)
        {
            _logger.LogWarning("Lesson {LessonId} not found", lessonId);
            return null;
        }

        var enrollment = await _learnerStudyCourses.GetByLearnerAndCourseAsync(learner.LearnerId, lesson.CourseId);
        if (enrollment == null)
        {
            _logger.LogInformation("No enrollment found for user {UserId} in course {CourseId}", userId, lesson.CourseId);
            return null;
        }

        var post = new DiscussionPost
        {
            LearnerId = learner.LearnerId,
            LessonId = lessonId,
            AuthorName = $"{learner.User.FirstName} {learner.User.LastName}".Trim(),
            Content = content,
            CreatedAt = DateTime.UtcNow,
        };
        await _posts.AddAsync(post, cancellationToken);
        await _posts.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created discussion post {PostId} for lesson {LessonId}", post.DiscussionPostId, lessonId);

        return MapToDto(post, learner.LearnerId);
    }

    private static DiscussionPostDto MapToDto(DiscussionPost post, int currentLearnerId)
        => new(
            PostId: post.DiscussionPostId,
            AuthorName: post.AuthorName,
            Content: post.Content,
            CreatedAt: post.CreatedAt,
            IsOwn: post.LearnerId == currentLearnerId
        );
}