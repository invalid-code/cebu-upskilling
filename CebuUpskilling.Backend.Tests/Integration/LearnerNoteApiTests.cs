using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CebuUpskilling.Backend.Tests.Integration;

public class LearnerNoteApiTests : ProductionApiTestBase
{
    public LearnerNoteApiTests(ProductionApiFactory factory) : base(factory) { }

    [RequiresPostgresFact]
    public async Task Upsert_CreatesNewNoteOnEverySave()
    {
        var token = await RegisterLearnerAsync("notes.crud@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonAsync(token);
        await EnrollAsync(token, courseId);
        var authorized = AuthorizedClient(token);

        var putResponse = await authorized.PutAsJsonAsync(
            $"/api/notes/lessons/{lessonId}",
            new { content = "first draft" });
        Assert.Equal(HttpStatusCode.OK, putResponse.StatusCode);
        var created = await ReadJsonAsync(putResponse);
        Assert.Equal(lessonId, created.GetProperty("lessonId").GetInt32());
        Assert.Equal("first draft", created.GetProperty("content").GetString());
        Assert.Equal(JsonValueKind.String, created.GetProperty("updatedAt").ValueKind);

        var getResponse = await authorized.GetAsync($"/api/notes/lessons/{lessonId}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var fetched = await ReadJsonAsync(getResponse);
        Assert.Equal("first draft", fetched.GetProperty("content").GetString());

        var updateResponse = await authorized.PutAsJsonAsync(
            $"/api/notes/lessons/{lessonId}",
            new { content = "second draft" });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await ReadJsonAsync(updateResponse);
        Assert.Equal("second draft", updated.GetProperty("content").GetString());

        var courseNotesResponse = await authorized.GetAsync($"/api/notes/courses/{courseId}");
        Assert.Equal(HttpStatusCode.OK, courseNotesResponse.StatusCode);
        var notes = (await ReadJsonAsync(courseNotesResponse)).GetProperty("notes").EnumerateArray().ToList();
        Assert.Equal(2, notes.Count);
        Assert.Equal(new[] { "first draft", "second draft" },
            notes.Select(n => n.GetProperty("content").GetString()));
        Assert.All(notes, n => Assert.Equal(lessonId, n.GetProperty("lessonId").GetInt32()));
    }

    [RequiresPostgresFact]
    public async Task Delete_RemovesNote_AndIsIdempotent()
    {
        var token = await RegisterLearnerAsync("notes.delete@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonAsync(token);
        await EnrollAsync(token, courseId);
        var authorized = AuthorizedClient(token);

        await authorized.PutAsJsonAsync($"/api/notes/lessons/{lessonId}", new { content = "to delete" });

        var deleteResponse = await authorized.DeleteAsync($"/api/notes/lessons/{lessonId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await authorized.GetAsync($"/api/notes/lessons/{lessonId}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var fetched = await ReadJsonAsync(getResponse);
        Assert.Equal(JsonValueKind.Null, fetched.GetProperty("content").ValueKind);

        var secondDeleteResponse = await authorized.DeleteAsync($"/api/notes/lessons/{lessonId}");
        Assert.Equal(HttpStatusCode.NoContent, secondDeleteResponse.StatusCode);
    }

    [RequiresPostgresFact]
    public async Task Upsert_NotEnrolled_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("notes.notenrolled@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonAsync(token);
        var authorized = AuthorizedClient(token);

        var putResponse = await authorized.PutAsJsonAsync($"/api/notes/lessons/{lessonId}", new { content = "draft" });
        Assert.Equal(HttpStatusCode.NotFound, putResponse.StatusCode);

        var courseResponse = await authorized.GetAsync($"/api/notes/courses/{courseId}");
        Assert.Equal(HttpStatusCode.NotFound, courseResponse.StatusCode);

        var lessonResponse = await authorized.GetAsync($"/api/notes/lessons/{lessonId}");
        Assert.Equal(HttpStatusCode.NotFound, lessonResponse.StatusCode);
    }

    [RequiresPostgresFact]
    public async Task Notes_AreScopedPerLearner()
    {
        var tokenA = await RegisterLearnerAsync("notes.scopea@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonAsync(tokenA);
        await EnrollAsync(tokenA, courseId);
        await AuthorizedClient(tokenA).PutAsJsonAsync($"/api/notes/lessons/{lessonId}", new { content = "A's secret" });

        var tokenB = await RegisterLearnerAsync("notes.scopeb@example.com");
        await EnrollAsync(tokenB, courseId);
        var clientB = AuthorizedClient(tokenB);

        var lessonResponse = await clientB.GetAsync($"/api/notes/lessons/{lessonId}");
        Assert.Equal(HttpStatusCode.OK, lessonResponse.StatusCode);
        var learnerBNote = await ReadJsonAsync(lessonResponse);
        Assert.Equal(JsonValueKind.Null, learnerBNote.GetProperty("content").ValueKind);

        await clientB.PutAsJsonAsync($"/api/notes/lessons/{lessonId}", new { content = "B's note" });

        var courseResponse = await clientB.GetAsync($"/api/notes/courses/{courseId}");
        var notesB = (await ReadJsonAsync(courseResponse)).GetProperty("notes").EnumerateArray().ToList();
        Assert.Equal("B's note", Assert.Single(notesB).GetProperty("content").GetString());

        var courseResponseA = await AuthorizedClient(tokenA).GetAsync($"/api/notes/courses/{courseId}");
        var notesA = (await ReadJsonAsync(courseResponseA)).GetProperty("notes").EnumerateArray().ToList();
        Assert.Equal("A's secret", Assert.Single(notesA).GetProperty("content").GetString());
    }

    [RequiresPostgresFact]
    public async Task Upsert_UnknownLesson_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("notes.missinglesson@example.com");

        var response = await AuthorizedClient(token).PutAsJsonAsync(
            "/api/notes/lessons/9999",
            new { content = "draft" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [RequiresPostgresFact]
    public async Task Upsert_EmptyContent_ReturnsBadRequest()
    {
        var token = await RegisterLearnerAsync("notes.empty@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonAsync(token);
        await EnrollAsync(token, courseId);

        var response = await AuthorizedClient(token).PutAsJsonAsync(
            $"/api/notes/lessons/{lessonId}",
            new { content = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [RequiresPostgresFact]
    public async Task Notes_RequireLearnerRole()
    {
        var registerResponse = await RegisterCompanyAsync(new
        {
            companyName = "Notes Corp",
            firstName = "Carmen",
            lastName = "Tan",
            emailAddress = "notes.recruiter@example.com",
            password = "P@ssw0rd!",
        });
        registerResponse.EnsureSuccessStatusCode();
        var token = (await ReadJsonAsync(registerResponse)).GetProperty("token").GetString()!;

        var response = await AuthorizedClient(token).GetAsync("/api/notes/courses/1");

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