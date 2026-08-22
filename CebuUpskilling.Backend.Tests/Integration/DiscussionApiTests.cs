using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace CebuUpskilling.Backend.Tests.Integration;

public class DiscussionApiTests : ProductionApiTestBase
{
    public DiscussionApiTests(ProductionApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetDiscussion_ForNewLesson_ReturnsEmptyPosts()
    {
        var token = await RegisterLearnerAsync("discussion.empty@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonAsync(token);
        await EnrollAsync(token, courseId);

        var response = await AuthorizedClient(token).GetAsync($"/api/discussions/lessons/{lessonId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal(lessonId, body.GetProperty("lessonId").GetInt32());
        Assert.Empty(body.GetProperty("posts").EnumerateArray());
    }

    [Fact]
    public async Task CreatePost_ThenFetch_ReturnsPostWithAuthor()
    {
        var token = await RegisterLearnerAsync("discussion.crud@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonAsync(token);
        await EnrollAsync(token, courseId);
        var authorized = AuthorizedClient(token);

        var postResponse = await authorized.PostAsJsonAsync(
            $"/api/discussions/lessons/{lessonId}/posts",
            new { content = "Can someone explain closures?" });
        Assert.Equal(HttpStatusCode.OK, postResponse.StatusCode);
        var created = await ReadJsonAsync(postResponse);
        Assert.Equal("Jose Rizal", created.GetProperty("authorName").GetString());
        Assert.Equal("Can someone explain closures?", created.GetProperty("content").GetString());
        Assert.True(created.GetProperty("isOwn").GetBoolean());
        Assert.Equal(JsonValueKind.String, created.GetProperty("createdAt").ValueKind);

        var getResponse = await authorized.GetAsync($"/api/discussions/lessons/{lessonId}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var discussion = await ReadJsonAsync(getResponse);
        var post = Assert.Single(discussion.GetProperty("posts").EnumerateArray());
        Assert.Equal("Can someone explain closures?", post.GetProperty("content").GetString());
        Assert.Equal("Jose Rizal", post.GetProperty("authorName").GetString());
    }

    [Fact]
    public async Task Get_NotEnrolled_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("discussion.notenrolled@example.com");
        var (_, lessonId) = await CreateCourseWithLessonAsync(token);

        var response = await AuthorizedClient(token).GetAsync($"/api/discussions/lessons/{lessonId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreatePost_NotEnrolled_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("discussion.notenrolled2@example.com");
        var (_, lessonId) = await CreateCourseWithLessonAsync(token);

        var response = await AuthorizedClient(token).PostAsJsonAsync(
            $"/api/discussions/lessons/{lessonId}/posts",
            new { content = "hi" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreatePost_UnknownLesson_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("discussion.missinglesson@example.com");

        var response = await AuthorizedClient(token).PostAsJsonAsync(
            "/api/discussions/lessons/9999/posts",
            new { content = "hi" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreatePost_EmptyContent_ReturnsBadRequest()
    {
        var token = await RegisterLearnerAsync("discussion.emptycontent@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonAsync(token);
        await EnrollAsync(token, courseId);

        var response = await AuthorizedClient(token).PostAsJsonAsync(
            $"/api/discussions/lessons/{lessonId}/posts",
            new { content = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task IsOwn_IsScopedPerLearner()
    {
        var tokenA = await RegisterLearnerAsync("discussion.owna@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonAsync(tokenA);
        await EnrollAsync(tokenA, courseId);
        await AuthorizedClient(tokenA).PostAsJsonAsync(
            $"/api/discussions/lessons/{lessonId}/posts",
            new { content = "A's question" });

        var tokenB = await RegisterLearnerAsync("discussion.ownb@example.com");
        await EnrollAsync(tokenB, courseId);

        var forB = await ReadJsonAsync(
            await AuthorizedClient(tokenB).GetAsync($"/api/discussions/lessons/{lessonId}"));
        var post = Assert.Single(forB.GetProperty("posts").EnumerateArray());
        Assert.Equal("A's question", post.GetProperty("content").GetString());
        Assert.False(post.GetProperty("isOwn").GetBoolean());
    }

    [Fact]
    public async Task Discussions_RequireLearnerRole()
    {
        var registerResponse = await RegisterAsync(new
        {
            firstName = "Carmen",
            lastName = "Tan",
            emailAddress = "discussion.recruiter@example.com",
            password = "P@ssw0rd!",
            role = "Recruiter",
        });
        registerResponse.EnsureSuccessStatusCode();
        var token = (await ReadJsonAsync(registerResponse)).GetProperty("token").GetString()!;

        var response = await AuthorizedClient(token).GetAsync("/api/discussions/lessons/1");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task<(int CourseId, int LessonId)> CreateCourseWithLessonAsync(string token)
    {
        var courseId = await CreateCourseAsync(token);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var module = new CourseModule
        {
            CourseId = courseId,
            Name = "Module 1",
            Description = "Foundations",
            Order = 1,
        };
        db.CourseModules.Add(module);
        await db.SaveChangesAsync();

        var lesson = new Lesson
        {
            CourseId = courseId,
            ModuleId = module.ModuleId,
            Name = "HTML Basics",
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();

        return (courseId, lesson.LessonId);
    }

    private async Task EnrollAsync(string token, int courseId)
    {
        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });
        response.EnsureSuccessStatusCode();
    }
}