using System.Net;
using System.Text;
using System.Text.Json;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Options;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Service-layer caches: identical reads are served from IMemoryCache within
/// the TTL (stale after a direct DB change), refresh paths invalidate trends,
/// and Gemini failures/empties are never cached.
/// </summary>
public class ServiceCacheTests
{
    private static ServiceCacheOptions EnabledOptions() => new()
    {
        Enabled = true,
        ReferenceDataMinutes = 240,
        UserComputedMinutes = 2,
        StatsMinutes = 5,
        GeminiHours = 24,
    };

    private static StatsService CreateStatsService(ApplicationDbContext context, IMemoryCache cache, ServiceCacheOptions? options = null) => new(
        new LearnerRepository(context),
        new LearnerStudyCourseRepository(context),
        new PostRepository(context),
        cache,
        Microsoft.Extensions.Options.Options.Create(options ?? EnabledOptions()),
        NullLogger<StatsService>.Instance
    );

    private static async Task<Guid> CreateLearnerAsync(ApplicationDbContext context)
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
        var learner = new Learner { UserId = user.UserId };
        context.Learners.Add(learner);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    [Fact]
    public async Task WeeklyStats_SecondCall_ServedFromCache()
    {
        var context = TestDbContextFactory.Create();
        var userId = await CreateLearnerAsync(context);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = CreateStatsService(context, cache);

        var first = await service.GetWeeklyStatsAsync(userId);
        Assert.Equal(0, first.CoursesActive);

        // Direct DB change behind the service's back: cached call stays stale.
        var learner = context.Learners.Single(l => l.UserId == userId);
        var course = new Course { Name = "Cached Course" };
        context.Courses.Add(course);
        await context.SaveChangesAsync();
        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = course.CourseId,
        });
        await context.SaveChangesAsync();

        var second = await service.GetWeeklyStatsAsync(userId);
        Assert.Equal(0, second.CoursesActive);

        // A fresh cache sees the new enrollment.
        var fresh = CreateStatsService(context, new MemoryCache(new MemoryCacheOptions()));
        Assert.Equal(1, (await fresh.GetWeeklyStatsAsync(userId)).CoursesActive);
    }

    [Fact]
    public async Task WeeklyStats_DisabledOption_AlwaysFresh()
    {
        var context = TestDbContextFactory.Create();
        var userId = await CreateLearnerAsync(context);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = CreateStatsService(context, cache, new ServiceCacheOptions { Enabled = false, StatsMinutes = 5 });

        Assert.Equal(0, (await service.GetWeeklyStatsAsync(userId)).CoursesActive);

        var learner = context.Learners.Single(l => l.UserId == userId);
        var course = new Course { Name = "Fresh Course" };
        context.Courses.Add(course);
        await context.SaveChangesAsync();
        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = course.CourseId,
        });
        await context.SaveChangesAsync();

        Assert.Equal(1, (await service.GetWeeklyStatsAsync(userId)).CoursesActive);
    }

    [Fact]
    public async Task MarketTrends_Refresh_InvalidatesCachedSnapshot()
    {
        var context = TestDbContextFactory.Create();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var trends = new JobMarketTrendService(
            context, cache, Microsoft.Extensions.Options.Options.Create(EnabledOptions()), NullLogger<JobMarketTrendService>.Instance);
        var posts = new PostService(
            new PostRepository(context),
            new PostSkillRepository(context),
            new RoleSkillRepository(context),
            new SkillRepository(context),
            NullLogger<PostService>.Instance,
            trends);

        Assert.Empty((await trends.GetTrendsAsync(10)).Skills);

        var company = new Company { Name = "Acme Corp" };
        context.Companies.Add(company);
        await context.SaveChangesAsync();
        var skill = new Skill { Name = "Welding" };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();
        await posts.CreateAsync(
            new PostRequest("Title", "Description", "Welder", null, null, "Full-time", null, null, null,
                IsActive: true, RequiredSkills: [new RequiredSkillInput(skill.SkillId, 3)]),
            company.CompanyId);

        // The refresh inside CreateAsync bumped the generation: no stale empty snapshot.
        Assert.Single((await trends.GetTrendsAsync(10)).Skills);

        // Direct DB delete behind the service's back: cached read stays stale (proves HIT).
        var row = context.SkillMarketTrends.Single();
        context.SkillMarketTrends.Remove(row);
        await context.SaveChangesAsync();
        Assert.Single((await trends.GetTrendsAsync(10)).Skills);
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        public int CallCount { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            var json = $"{{\"candidates\":[{{\"content\":{{\"parts\":[{{\"text\":{JsonSerializer.Serialize("[\"React\"]")}}}]}}}}]}}";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            });
        }
    }

    private static GoogleAiService CreateGeminiService(StubHandler handler, IMemoryCache cache, ServiceCacheOptions? options = null)
    {
        var aiOptions = new GoogleAiOptions
        {
            ApiKey = "test-api-key",
            Model = "test-model",
            BaseUrl = "https://generativelanguage.googleapis.com/v1beta",
        };
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://generativelanguage.googleapis.com/v1beta/") };
        return new GoogleAiService(
            client,
            Microsoft.Extensions.Options.Options.Create(aiOptions),
            cache,
            Microsoft.Extensions.Options.Options.Create(options ?? EnabledOptions()),
            NullLogger<GoogleAiService>.Instance);
    }

    [Fact]
    public async Task ParseSkillsFromResume_DuplicateText_CallsModelOnce()
    {
        var handler = new StubHandler();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = CreateGeminiService(handler, cache);

        const string resume = "Frontend developer skilled in React.";
        var first = await service.ParseSkillsFromResumeAsync(resume);
        var second = await service.ParseSkillsFromResumeAsync(resume);

        Assert.Equal(["React"], first);
        Assert.Equal(["React"], second);
        Assert.Equal(1, handler.CallCount);
    }

    [Fact]
    public void CacheKeys_PerUserKeys_DifferPerUser()
    {
        var a = ServiceCacheKeys.SkillGaps(Guid.NewGuid());
        var b = ServiceCacheKeys.SkillGaps(Guid.NewGuid());
        Assert.NotEqual(a, b);
        Assert.StartsWith("svc:gaps:user:", a);
    }
}
