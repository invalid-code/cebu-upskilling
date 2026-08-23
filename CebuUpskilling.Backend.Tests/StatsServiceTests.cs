using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class StatsServiceTests
{
    private static StatsService CreateService(ApplicationDbContext context) => new(
        new LearnerRepository(context),
        new LearnerStudyCourseRepository(context),
        new PostRepository(context),
        NullLogger<StatsService>.Instance
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

    private static async Task<int> CreateCourseAsync(ApplicationDbContext context, string name)
    {
        var course = new Course { Name = name };
        context.Courses.Add(course);
        await context.SaveChangesAsync();
        return course.CourseId;
    }

    private static async Task<int> CreatePostAsync(ApplicationDbContext context)
    {
        var company = new Company { Name = "Acme Corp" };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var recruiterUser = new AppUser
        {
            FirstName = "Recruiter",
            LastName = "User",
            EmailAddress = $"recruiter-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Recruiter",
        };
        context.Users.Add(recruiterUser);
        await context.SaveChangesAsync();

        recruiterUser.CompanyId = company.CompanyId;
        await context.SaveChangesAsync();

        var post = new Post { CompanyId = company.CompanyId, Title = "Job posting" };
        context.Posts.Add(post);
        await context.SaveChangesAsync();
        return post.PostId;
    }

    [Fact]
    public async Task GetWeeklyStatsAsync_WhenNoLearnerProfile_ReturnsZeros()
    {
        var context = TestDbContextFactory.Create();

        var stats = await CreateService(context).GetWeeklyStatsAsync(999);

        Assert.Equal(0, stats.LearningTimeHours);
        Assert.Equal(0, stats.CoursesActive);
        Assert.Equal(0, stats.JobsWorthApplying);
    }

    [Fact]
    public async Task GetWeeklyStatsAsync_SumsLearningTimeAndCountsCoursesAndJobs()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);

        var courseA = await CreateCourseAsync(context, "Intro to Frontend");
        var courseB = await CreateCourseAsync(context, "Advanced React");

        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = courseA,
            Started = DateTime.UtcNow,
            LastTotalProgressPercent = 25,
        });
        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = courseB,
            Started = DateTime.UtcNow,
            LastTotalProgressPercent = 40,
        });
        await context.SaveChangesAsync();

        await CreatePostAsync(context);
        await CreatePostAsync(context);
        await CreatePostAsync(context);

        var stats = await CreateService(context).GetWeeklyStatsAsync(user.UserId);

        Assert.Equal(6.5, stats.LearningTimeHours);
        Assert.Equal(2, stats.CoursesActive);
        Assert.Equal(3, stats.JobsWorthApplying);
    }

    [Fact]
    public async Task GetWeeklyStatsAsync_RoundsLearningTimeToOneDecimalPlace()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);

        var course = await CreateCourseAsync(context, "Rounded Course");

        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = course,
            Started = DateTime.UtcNow,
            LastTotalProgressPercent = 33,
        });
        await context.SaveChangesAsync();

        var stats = await CreateService(context).GetWeeklyStatsAsync(user.UserId);

        Assert.Equal(3.3, stats.LearningTimeHours);
        Assert.Equal(1, stats.CoursesActive);
    }
}
