using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class NotesServiceTests
{
    private static NotesService CreateService(ApplicationDbContext context) => new(
        new LearnerRepository(context),
        new LessonRepository(context),
        new LearnerStudyCourseRepository(context),
        new LearnerNoteRepository(context),
        NullLogger<NotesService>.Instance
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

    private static async Task<Course> CreateCourseWithLessonAsync(ApplicationDbContext context)
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

        var module = new CourseModule { CourseId = course.CourseId, Name = "Module 1", Order = 1 };
        context.CourseModules.Add(module);
        await context.SaveChangesAsync();

        context.Lessons.Add(new Lesson { ModuleId = module.ModuleId, CourseId = course.CourseId, Name = "Lesson 1" });
        await context.SaveChangesAsync();

        return course;
    }

    private static async Task EnrollAsync(ApplicationDbContext context, int learnerId, int courseId)
    {
        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learnerId,
            CourseId = courseId,
            Started = DateTime.UtcNow.AddDays(-1),
            LastTotalProgressPercent = 0,
            LastOnline = DateTime.UtcNow.AddDays(-1),
        });
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task GetCourseNotesAsync_WhenNoLearnerProfile_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();

        var result = await CreateService(context).GetCourseNotesAsync(999, 1);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetCourseNotesAsync_WhenNotEnrolled_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonAsync(context);

        var result = await CreateService(context).GetCourseNotesAsync(user.UserId, course.CourseId);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetLessonNoteAsync_WithoutNote_ReturnsEmptyContent()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonAsync(context);
        await EnrollAsync(context, learner.LearnerId, course.CourseId);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);

        var result = await CreateService(context).GetLessonNoteAsync(user.UserId, lesson.LessonId);

        Assert.NotNull(result);
        Assert.Equal(lesson.LessonId, result!.LessonId);
        Assert.Null(result.Content);
        Assert.Null(result.UpdatedAt);
    }

    [Fact]
    public async Task UpsertLessonNoteAsync_WhenNotEnrolled_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonAsync(context);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);

        var result = await CreateService(context).UpsertLessonNoteAsync(user.UserId, lesson.LessonId, "draft");

        Assert.Null(result);
    }

    [Fact]
    public async Task UpsertLessonNoteAsync_WhenLessonMissing_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);

        var result = await CreateService(context).UpsertLessonNoteAsync(user.UserId, 999, "draft");

        Assert.Null(result);
    }

    [Fact]
    public async Task UpsertLessonNoteAsync_CreatesThenUpdatesSingleNote()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonAsync(context);
        await EnrollAsync(context, learner.LearnerId, course.CourseId);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);
        var service = CreateService(context);

        var created = await service.UpsertLessonNoteAsync(user.UserId, lesson.LessonId, "first draft");

        Assert.NotNull(created);
        Assert.Equal("first draft", created!.Content);
        Assert.NotNull(created.UpdatedAt);
        Assert.Single(context.LearnerNotes);

        var updated = await service.UpsertLessonNoteAsync(user.UserId, lesson.LessonId, "second draft");

        Assert.NotNull(updated);
        Assert.Equal("second draft", updated!.Content);
        Assert.Single(context.LearnerNotes);
        Assert.Equal("second draft", context.LearnerNotes.Single().Content);
    }

    [Fact]
    public async Task GetCourseNotesAsync_ReturnsNotesForLearnersCourse()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonAsync(context);
        await EnrollAsync(context, learner.LearnerId, course.CourseId);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);

        await CreateService(context).UpsertLessonNoteAsync(user.UserId, lesson.LessonId, "course note");

        var result = await CreateService(context).GetCourseNotesAsync(user.UserId, course.CourseId);

        Assert.NotNull(result);
        Assert.Equal(course.CourseId, result!.CourseId);
        var note = Assert.Single(result.Notes);
        Assert.Equal(lesson.LessonId, note.LessonId);
        Assert.Equal("course note", note.Content);
    }

    [Fact]
    public async Task Notes_AreScopedPerLearner()
    {
        var context = TestDbContextFactory.Create();
        var (userA, learnerA) = await CreateLearnerAsync(context);
        var (userB, learnerB) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonAsync(context);
        await EnrollAsync(context, learnerA.LearnerId, course.CourseId);
        await EnrollAsync(context, learnerB.LearnerId, course.CourseId);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);
        var service = CreateService(context);

        await service.UpsertLessonNoteAsync(userA.UserId, lesson.LessonId, "A's secret");

        var forB = await service.GetLessonNoteAsync(userB.UserId, lesson.LessonId);

        Assert.NotNull(forB);
        Assert.Null(forB!.Content);

        await service.UpsertLessonNoteAsync(userB.UserId, lesson.LessonId, "B's note");

        var notesForB = (await service.GetCourseNotesAsync(userB.UserId, course.CourseId))!.Notes;
        Assert.Equal("B's note", Assert.Single(notesForB).Content);
        Assert.Equal(2, context.LearnerNotes.Count());
        Assert.Single(context.LearnerNotes.Where(n => n.LearnerId == learnerA.LearnerId));
        Assert.Single(context.LearnerNotes.Where(n => n.LearnerId == learnerB.LearnerId));
    }

    [Fact]
    public async Task DeleteLessonNoteAsync_RemovesNote_AndIsIdempotent()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonAsync(context);
        await EnrollAsync(context, learner.LearnerId, course.CourseId);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);
        var service = CreateService(context);

        await service.UpsertLessonNoteAsync(user.UserId, lesson.LessonId, "to delete");

        Assert.True(await service.DeleteLessonNoteAsync(user.UserId, lesson.LessonId));
        Assert.Empty(context.LearnerNotes);

        Assert.True(await service.DeleteLessonNoteAsync(user.UserId, lesson.LessonId));
    }

    [Fact]
    public async Task DeleteLessonNoteAsync_WhenLessonMissing_ReturnsFalse()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);

        var result = await CreateService(context).DeleteLessonNoteAsync(user.UserId, 999);

        Assert.False(result);
    }
}