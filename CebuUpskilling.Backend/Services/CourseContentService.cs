using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

public interface ICourseContentService
{
    Task<CourseContentResponse?> GetCourseContentAsync(int userId, int courseId, int? lessonId = null);
    Task<LessonDetailDto?> GetLessonDetailAsync(int userId, int lessonId);
    Task<LessonProgressDto?> UpdateLessonProgressAsync(int userId, int lessonId, int progressPercent);
}

public class CourseContentService : ICourseContentService
{
    private readonly ILearnerRepository _learners;
    private readonly ICourseRepository _courses;
    private readonly ILessonRepository _lessons;
    private readonly ILearnerStudyCourseRepository _learnerStudyCourses;
    private readonly ILogger<CourseContentService> _logger;

    public CourseContentService(
        ILearnerRepository learners,
        ICourseRepository courses,
        ILessonRepository lessons,
        ILearnerStudyCourseRepository learnerStudyCourses,
        ILogger<CourseContentService> logger)
    {
        _learners = learners;
        _courses = courses;
        _lessons = lessons;
        _learnerStudyCourses = learnerStudyCourses;
        _logger = logger;
    }

    public async Task<CourseContentResponse?> GetCourseContentAsync(int userId, int courseId, int? lessonId = null)
    {
        _logger.LogDebug("Getting course content for user {UserId}, course {CourseId}", userId, courseId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}", userId);
            return null;
        }

        var enrollment = await _learnerStudyCourses.GetByLearnerAndCourseAsync(learner.LearnerId, courseId);
        if (enrollment == null)
        {
            _logger.LogInformation("No enrollment found for user {UserId} in course {CourseId}", userId, courseId);
            return null;
        }

        var course = await _courses.GetWithLessonsAsync(courseId);
        if (course == null)
        {
            _logger.LogWarning("Course {CourseId} not found", courseId);
            return null;
        }

        var lessons = await _lessons.GetByCourseIdWithContentAsync(courseId);
        if (lessons.Count == 0)
        {
            _logger.LogWarning("No lessons found for course {CourseId}", courseId);
            return null;
        }

        var currentLessonId = lessonId ?? lessons.First().LessonId;
        var currentLesson = lessons.FirstOrDefault(l => l.LessonId == currentLessonId) ?? lessons.First();

        var progressPercent = enrollment.LastTotalProgressPercent;
        var completedLessons = (int)Math.Ceiling(progressPercent / 100.0 * lessons.Count);

        var modules = BuildModuleList(lessons, completedLessons, currentLessonId);

        var lessonDetail = MapToLessonDetailDto(currentLesson);

        return new CourseContentResponse(
            CourseId: course.CourseId,
            CourseName: course.Name,
            Description: course.Description,
            TotalLessons: lessons.Count,
            CompletedLessons: completedLessons,
            ProgressPercent: progressPercent,
            Modules: modules,
            CurrentLesson: lessonDetail
        );
    }

    public async Task<LessonDetailDto?> GetLessonDetailAsync(int userId, int lessonId)
    {
        _logger.LogDebug("Getting lesson detail for user {UserId}, lesson {LessonId}", userId, lessonId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}", userId);
            return null;
        }

        var lesson = await _lessons.GetWithContentAsync(lessonId);
        if (lesson == null)
        {
            _logger.LogWarning("Lesson {LessonId} not found", lessonId);
            return null;
        }

        return MapToLessonDetailDto(lesson);
    }

    public async Task<LessonProgressDto?> UpdateLessonProgressAsync(int userId, int lessonId, int progressPercent)
    {
        _logger.LogDebug("Updating lesson progress for user {UserId}, lesson {LessonId} to {ProgressPercent}%", userId, lessonId, progressPercent);

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

        var allLessons = await _lessons.GetByCourseIdAsync(lesson.CourseId);
        var lessonIndex = allLessons.FindIndex(l => l.LessonId == lessonId);
        if (lessonIndex < 0)
        {
            _logger.LogWarning("Lesson {LessonId} not found in course {CourseId}", lessonId, lesson.CourseId);
            return null;
        }

        var totalLessons = allLessons.Count;
        var lessonWeight = 100.0 / totalLessons;
        var lessonProgress = Math.Min(100, Math.Max(0, progressPercent));

        var newOverallProgress = (int)((lessonIndex + lessonProgress / 100.0) * lessonWeight);
        newOverallProgress = Math.Min(100, Math.Max(enrollment.LastTotalProgressPercent, newOverallProgress));

        enrollment.LastTotalProgressPercent = newOverallProgress;
        enrollment.LastOnline = DateTime.UtcNow;

        await _learnerStudyCourses.SaveChangesAsync();

        _logger.LogInformation("Updated progress for user {UserId}, lesson {LessonId}: overall {ProgressPercent}%", userId, lessonId, newOverallProgress);

        return new LessonProgressDto(
            LessonId: lessonId,
            IsCompleted: lessonProgress >= 100,
            ProgressPercent: lessonProgress
        );
    }

    private static List<CourseModuleDto> BuildModuleList(
        List<Entities.Lesson> lessons,
        int completedLessons,
        int currentLessonId)
    {
        var modules = new List<CourseModuleDto>();
        var moduleNumber = 1;

        foreach (var lesson in lessons)
        {
            var lessonIndex = lessons.IndexOf(lesson);
            var isCompleted = lessonIndex < completedLessons;
            var isCurrent = lesson.LessonId == currentLessonId;

            modules.Add(new CourseModuleDto(
                ModuleNumber: moduleNumber++,
                Name: lesson.Name,
                Description: lesson.Description,
                LessonCount: 1,
                CompletedLessonCount: isCompleted ? 1 : 0,
                Lessons: new List<LessonOutlineDto>
                {
                    new LessonOutlineDto(
                        LessonId: lesson.LessonId,
                        Name: lesson.Name,
                        DurationMinutes: 10 + (lessonIndex * 2),
                        IsCompleted: isCompleted,
                        IsCurrent: isCurrent
                    )
                }
            ));
        }

        return modules;
    }

    private static LessonDetailDto MapToLessonDetailDto(Entities.Lesson lesson)
    {
        var contentBlocks = lesson.LessonContents
            .Select(lc => new LessonContentBlockDto(
                ContentId: lc.ContentId,
                BlockType: lc.BlockType,
                Content: lc.Content,
                LessonOrder: lc.LessonOrder,
                TopicOrder: lc.TopicOrder
            ))
            .ToList();

        var media = lesson.Media
            .Select(m => new MediaDto(
                MediaId: m.MediaId,
                PathFile: m.PathFile,
                Type: m.Type,
                MbSize: m.MbSize
            ))
            .ToList();

        var exercises = lesson.Exercises
            .Select(e => new ExerciseDto(
                ExerciseId: e.ExerciseId,
                Type: e.Type,
                AnswerKey: e.AnswerKey,
                Content: e.ExerciseContent?.Content,
                ContentType: e.ExerciseContent?.BlockType
            ))
            .ToList();

        return new LessonDetailDto(
            LessonId: lesson.LessonId,
            Name: lesson.Name,
            Description: lesson.Description,
            LessonOrder: lesson.LessonId,
            ContentBlocks: contentBlocks,
            Media: media,
            Exercises: exercises
        );
    }
}
