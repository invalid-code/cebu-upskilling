using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class DiscussionServiceTests
{
    private static DiscussionService CreateService(ApplicationDbContext context) => new(
        new LearnerRepository(context),
        new LessonRepository(context),
        new LearnerStudyCourseRepository(context),
        new DiscussionPostRepository(context),
        NullLogger<DiscussionService>.Instance
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
    public async Task GetLessonDiscussionAsync_WhenNoLearnerProfile_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();

        var result = await CreateService(context).GetLessonDiscussionAsync(999, 1);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetLessonDiscussionAsync_WhenLessonMissing_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);

        var result = await CreateService(context).GetLessonDiscussionAsync(user.UserId, 999);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetLessonDiscussionAsync_WhenNotEnrolled_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonAsync(context);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);

        var result = await CreateService(context).GetLessonDiscussionAsync(user.UserId, lesson.LessonId);

        Assert.Null(result);
    }

    [Fact]
    public async Task CreatePostAsync_AndReturnsOwnedPost()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonAsync(context);
        await EnrollAsync(context, learner.LearnerId, course.CourseId);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);
        var service = CreateService(context);

        var created = await service.CreatePostAsync(user.UserId, lesson.LessonId, "Has anyone tried this?");

        Assert.NotNull(created);
        Assert.Equal("Jose Rizal", created!.AuthorName);
        Assert.Equal("Has anyone tried this?", created.Content);
        Assert.True(created.IsOwn);
        Assert.NotEqual(default, created.CreatedAt);

        var discussion = await service.GetLessonDiscussionAsync(user.UserId, lesson.LessonId);
        Assert.NotNull(discussion);
        Assert.Equal(lesson.LessonId, discussion!.LessonId);
        var post = Assert.Single(discussion.Posts);
        Assert.Equal("Jose Rizal", post.AuthorName);
        Assert.True(post.IsOwn);
    }

    [Fact]
    public async Task CreatePostAsync_WhenNotEnrolled_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonAsync(context);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);

        var result = await CreateService(context).CreatePostAsync(user.UserId, lesson.LessonId, "unheard");

        Assert.Null(result);
    }

    [Fact]
    public async Task CreatePostAsync_WhenLessonMissing_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);

        var result = await CreateService(context).CreatePostAsync(user.UserId, 999, "unheard");

        Assert.Null(result);
    }

    [Fact]
    public async Task Posts_AreOrderedByCreatedAtAndIsOwnIsPerLearner()
    {
        var context = TestDbContextFactory.Create();
        var (userA, learnerA) = await CreateLearnerAsync(context);
        var (userB, learnerB) = await CreateLearnerAsync(context);
        var course = await CreateCourseWithLessonAsync(context);
        await EnrollAsync(context, learnerA.LearnerId, course.CourseId);
        await EnrollAsync(context, learnerB.LearnerId, course.CourseId);
        var lesson = context.Lessons.Single(l => l.CourseId == course.CourseId);
        var service = CreateService(context);

        await service.CreatePostAsync(userA.UserId, lesson.LessonId, "first post");
        await service.CreatePostAsync(userB.UserId, lesson.LessonId, "second post");

        var forB = await service.GetLessonDiscussionAsync(userB.UserId, lesson.LessonId);

        Assert.NotNull(forB);
        Assert.Equal(2, forB!.Posts.Count);
        Assert.Equal(new[] { "first post", "second post" }, forB.Posts.Select(p => p.Content));
        Assert.False(forB.Posts[0].IsOwn);
        Assert.True(forB.Posts[1].IsOwn);
    }
}