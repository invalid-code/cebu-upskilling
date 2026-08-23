using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class CourseContentServiceTests
{
    private static CourseContentService CreateService(ApplicationDbContext context) => new(
        new LearnerRepository(context),
        new CourseRepository(context),
        new LessonRepository(context),
        new LearnerStudyCourseRepository(context),
        NullLogger<CourseContentService>.Instance
    );

    private static async Task<(AppUser User, Learner Learner)> CreateLearnerAsync(ApplicationDbContext context)
    {
        var user = new AppUser
        {
            FirstName = "Jose",
            LastName = "Rizal",
            EmailAddress = $"learner-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Learner",
        };
        context.Users.Add(user);

        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);
        await context.SaveChangesAsync();
        return (user, learner);
    }

    private static async Task<Course> CreateCourseWithLessonsAsync(
        ApplicationDbContext context,
        int lessonCount,
        bool withContent = false,
        int? moduleCount = null)
    {
        var discipline = new Discipline { Name = "Technology" };
        context.Disciplines.Add(discipline);
        await context.SaveChangesAsync();

        var sub = new SubDiscipline { DisciplineId = discipline.DomainId, Name = "Web Development" };
        context.SubDisciplines.Add(sub);
        await context.SaveChangesAsync();

        var genre = new Genre { SubDisciplineId = sub.SubDisciplineId, Name = "Frontend" };
        context.Genres.Add(genre);
        await context.SaveChangesAsync();

        var course = new Course { GenreId = genre.GenreId, Name = "React Basics" };
        context.Courses.Add(course);
        await context.SaveChangesAsync();

        var moduleCountValue = moduleCount ?? lessonCount;
        var modules = new List<CourseModule>();
        for (var m = 0; m < moduleCountValue; m++)
        {
            var module = new CourseModule { CourseId = course.CourseId, Name = $"Module {m + 1}", Order = m + 1 };
            context.CourseModules.Add(module);
            await context.SaveChangesAsync();
            modules.Add(module);
        }

        for (var i = 0; i < lessonCount; i++)
        {
            var module = modules[Math.Min(i * moduleCountValue / lessonCount, modules.Count - 1)];
            var lesson = new Lesson { ModuleId = module.ModuleId, CourseId = course.CourseId, Name = $"Lesson {i + 1}" };
            context.Lessons.Add(lesson);
            await context.SaveChangesAsync();

            if (withContent)
            {
                context.LessonContents.Add(new LessonContent
                {
                    LessonId = lesson.LessonId,
                    BlockType = "text",
                    Content = $"Content for lesson {i + 1}",
                    LessonOrder = i + 1,
                    TopicOrder = 1,
                });
                context.Media.Add(new Media
                {
                    LessonId = lesson.LessonId,
                    PathFile = $"media/lesson-{i + 1}.mp4",
                    Type = "video",
                    MbSize = 12.5,
                });

                var exercise = new Exercise
                {
                    LessonId = lesson.LessonId,
                    Type = "multiple_choice",
                    AnswerKey = "A",
                };
                context.Exercises.Add(exercise);
                await context.SaveChangesAsync();

                context.ExerciseContents.Add(new ExerciseContent
                {
                    ExerciseId = exercise.ExerciseId,
                    BlockType = "question",
                    Content = $"Question for lesson {i + 1}",
                });
            }
        }
        await context.SaveChangesAsync();
        return course;
    }

    private static async Task EnrollAsync(ApplicationDbContext context, int learnerId, int courseId, int progress)
    {
        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learnerId,
            CourseId = courseId,
            Started = DateTime.UtcNow.AddDays(-1),
            LastTotalProgressPercent = progress,
            LastOnline = DateTime.UtcNow.AddDays(-1),
        });
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task GetCourseContentAsync_WhenNoLearnerProfile_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();

        var result = await CreateService(context).GetCourseContentAsync(999, 1);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetCourseContentAsync_WhenNotEnrolled_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonsAsync(context, lessonCount: 2);

        var result = await CreateService(context).GetCourseContentAsync(user.UserId, course.CourseId);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetCourseContentAsync_WhenCourseHasNoLessons_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonsAsync(context, lessonCount: 0);
        await EnrollAsync(context, learner.LearnerId, course.CourseId, 0);

        var result = await CreateService(context).GetCourseContentAsync(user.UserId, course.CourseId);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetCourseContentAsync_ReturnsContentWithCurrentLessonAndProgress()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonsAsync(context, lessonCount: 2, withContent: true);
        await EnrollAsync(context, learner.LearnerId, course.CourseId, 50);

        var result = await CreateService(context).GetCourseContentAsync(user.UserId, course.CourseId);

        Assert.NotNull(result);
        Assert.Equal(course.CourseId, result!.CourseId);
        Assert.Equal("React Basics", result.CourseName);
        Assert.Equal(2, result.TotalLessons);
        Assert.Equal(1, result.CompletedLessons);
        Assert.Equal(50, result.ProgressPercent);
        Assert.Equal(2, result.Modules.Count);

        Assert.True(result.Modules[0].Lessons[0].IsCompleted);
        Assert.False(result.Modules[0].Lessons[0].IsCurrent);
        Assert.Equal(10, result.Modules[0].Lessons[0].DurationMinutes);

        Assert.False(result.Modules[1].Lessons[0].IsCompleted);
        Assert.True(result.Modules[1].Lessons[0].IsCurrent);
        Assert.Equal(12, result.Modules[1].Lessons[0].DurationMinutes);

        Assert.Equal("Lesson 2", result.CurrentLesson.Name);
        Assert.Single(result.CurrentLesson.ContentBlocks);
        Assert.Single(result.CurrentLesson.Media);
        Assert.Single(result.CurrentLesson.Exercises);
    }

    [Fact]
    public async Task GetCourseContentAsync_WhenLessonIdSpecified_SetsCurrentLesson()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonsAsync(context, lessonCount: 2);
        await EnrollAsync(context, learner.LearnerId, course.CourseId, 0);

        var lessons = context.Lessons.Where(l => l.CourseId == course.CourseId).OrderBy(l => l.LessonId).ToList();
        var secondLessonId = lessons[1].LessonId;

        var result = await CreateService(context).GetCourseContentAsync(user.UserId, course.CourseId, secondLessonId);

        Assert.NotNull(result);
        Assert.Equal(secondLessonId, result!.CurrentLesson.LessonId);
        Assert.True(result.Modules[1].Lessons[0].IsCurrent);
        Assert.False(result.Modules[0].Lessons[0].IsCurrent);
    }

    [Fact]
    public async Task GetCourseContentAsync_GroupsLessonsUnderRealModules()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonsAsync(context, lessonCount: 4, moduleCount: 2);
        await EnrollAsync(context, learner.LearnerId, course.CourseId, 0);

        var result = await CreateService(context).GetCourseContentAsync(user.UserId, course.CourseId);

        Assert.NotNull(result);
        Assert.Equal(2, result!.Modules.Count);
        Assert.Equal("Module 1", result.Modules[0].Name);
        Assert.Equal("Module 2", result.Modules[1].Name);
        Assert.Equal(2, result.Modules[0].LessonCount);
        Assert.Equal(2, result.Modules[0].Lessons.Count);
        Assert.Equal(2, result.Modules[1].LessonCount);
        Assert.Equal("Lesson 1", result.Modules[0].Lessons[0].Name);
        Assert.Equal("Lesson 2", result.Modules[0].Lessons[1].Name);
        Assert.Equal("Lesson 3", result.Modules[1].Lessons[0].Name);
        Assert.Equal("Lesson 4", result.Modules[1].Lessons[1].Name);
    }

    [Fact]
    public async Task GetLessonDetailAsync_WhenNoLearnerProfileOrLesson_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();

        Assert.Null(await CreateService(context).GetLessonDetailAsync(999, 1));

        var (user, _) = await CreateLearnerAsync(context);
        Assert.Null(await CreateService(context).GetLessonDetailAsync(user.UserId, 999));
    }

    [Fact]
    public async Task GetLessonDetailAsync_MapsContentBlocksMediaAndExercises()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonsAsync(context, lessonCount: 1, withContent: true);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);

        var result = await CreateService(context).GetLessonDetailAsync(user.UserId, lesson.LessonId);

        Assert.NotNull(result);
        Assert.Equal(lesson.LessonId, result!.LessonId);
        Assert.Equal(lesson.LessonId, result.LessonOrder);

        var block = Assert.Single(result.ContentBlocks);
        Assert.Equal("text", block.BlockType);
        Assert.Equal("Content for lesson 1", block.Content);

        var media = Assert.Single(result.Media);
        Assert.Equal("media/lesson-1.mp4", media.PathFile);
        Assert.Equal("video", media.Type);
        Assert.Equal(12.5, media.MbSize);

        var exercise = Assert.Single(result.Exercises);
        Assert.Equal("multiple_choice", exercise.Type);
        Assert.Equal("A", exercise.AnswerKey);
        Assert.Equal("Question for lesson 1", exercise.Content);
        Assert.Equal("question", exercise.ContentType);
    }

    [Fact]
    public async Task UpdateLessonProgressAsync_WhenNoEnrollment_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonsAsync(context, lessonCount: 1);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);

        var result = await CreateService(context).UpdateLessonProgressAsync(user.UserId, lesson.LessonId, 100);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateLessonProgressAsync_UpdatesOverallProgressWithoutRegressing()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonsAsync(context, lessonCount: 2);
        await EnrollAsync(context, learner.LearnerId, course.CourseId, 0);

        var lessons = context.Lessons.Where(l => l.CourseId == course.CourseId).OrderBy(l => l.LessonId).ToList();
        var service = CreateService(context);

        var first = await service.UpdateLessonProgressAsync(user.UserId, lessons[0].LessonId, 50);
        Assert.NotNull(first);
        Assert.False(first!.IsCompleted);
        Assert.Equal(50, first.ProgressPercent);

        var second = await service.UpdateLessonProgressAsync(user.UserId, lessons[1].LessonId, 100);
        Assert.NotNull(second);
        Assert.True(second!.IsCompleted);
        Assert.Equal(100, second.ProgressPercent);

        var enrollment = context.LearnerStudyCourses.Single(e => e.CourseId == course.CourseId);
        Assert.Equal(100, enrollment.LastTotalProgressPercent);
        Assert.NotNull(enrollment.LastOnline);

        var regressed = await service.UpdateLessonProgressAsync(user.UserId, lessons[0].LessonId, 10);
        Assert.NotNull(regressed);
        Assert.Equal(100, context.LearnerStudyCourses.Single(e => e.CourseId == course.CourseId).LastTotalProgressPercent);
    }
}
