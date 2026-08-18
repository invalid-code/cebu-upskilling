using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class EnrollmentsServiceTests
{
    private static EnrollmentsService CreateService(ApplicationDbContext context) => new(
        new LearnerRepository(context),
        new CourseRepository(context),
        new LearnerStudyCourseRepository(context),
        NullLogger<EnrollmentsService>.Instance
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

    private static async Task<Course> CreateCourseAsync(ApplicationDbContext context, string name = "Intro to Frontend")
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

        var course = new Course { GenreId = genre.GenreId, Name = name };
        context.Courses.Add(course);
        await context.SaveChangesAsync();
        return course;
    }

    [Fact]
    public async Task GetMyEnrollmentsAsync_WhenNoLearnerProfile_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();

        var result = await CreateService(context).GetMyEnrollmentsAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetMyEnrollmentsAsync_ReturnsEnrollmentSummaries()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseAsync(context);

        var started = DateTime.UtcNow.AddDays(-2);
        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = course.CourseId,
            Started = started,
            LastTotalProgressPercent = 45,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetMyEnrollmentsAsync(user.UserId);

        Assert.NotNull(result);
        var summary = Assert.Single(result!);
        Assert.Equal(course.CourseId, summary.CourseId);
        Assert.Equal(course.Name, summary.CourseName);
        Assert.Equal(started, summary.Started);
        Assert.Equal(45, summary.LastTotalProgressPercent);
    }

    [Fact]
    public async Task EnrollAsync_WhenNoLearnerProfile_ReturnsNoLearnerProfile()
    {
        var context = TestDbContextFactory.Create();
        var course = await CreateCourseAsync(context);

        var outcome = await CreateService(context).EnrollAsync(999, course.CourseId);

        Assert.False(outcome.Success);
        Assert.Equal(EnrollFailure.NoLearnerProfile, outcome.Failure);
        Assert.Null(outcome.CourseId);
    }

    [Fact]
    public async Task EnrollAsync_WhenCourseNotFound_ReturnsCourseNotFound()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);

        var outcome = await CreateService(context).EnrollAsync(user.UserId, 999);

        Assert.False(outcome.Success);
        Assert.Equal(EnrollFailure.CourseNotFound, outcome.Failure);
    }

    [Fact]
    public async Task EnrollAsync_WhenAlreadyEnrolled_ReturnsAlreadyEnrolled()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseAsync(context);

        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = course.CourseId,
            Started = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var outcome = await CreateService(context).EnrollAsync(user.UserId, course.CourseId);

        Assert.False(outcome.Success);
        Assert.Equal(EnrollFailure.AlreadyEnrolled, outcome.Failure);
    }

    [Fact]
    public async Task EnrollAsync_WhenValid_PersistsEnrollmentAndReturnsOutcome()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseAsync(context);

        var outcome = await CreateService(context).EnrollAsync(user.UserId, course.CourseId);

        Assert.True(outcome.Success);
        Assert.Null(outcome.Failure);
        Assert.Equal(course.CourseId, outcome.CourseId);
        Assert.NotNull(outcome.Started);

        var saved = await context.LearnerStudyCourses.SingleAsync(e => e.CourseId == course.CourseId);
        Assert.Equal(learner.LearnerId, saved.LearnerId);
        Assert.Equal(0, saved.LastTotalProgressPercent);
        Assert.NotNull(saved.Started);
    }
}
