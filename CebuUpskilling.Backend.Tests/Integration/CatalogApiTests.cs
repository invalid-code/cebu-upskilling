using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace CebuUpskilling.Backend.Tests.Integration;

public class CatalogApiTests : ProductionApiTestBase
{
    public CatalogApiTests(ProductionApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Disciplines_AreSeeded_AndRequireAuth()
    {
        var token = await RegisterLearnerAsync("catalog.disciplines@example.com");

        var response = await AuthorizedClient(token).GetAsync("/api/disciplines");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);

        var disciplines = body.EnumerateArray().ToList();
        Assert.Equal(4, disciplines.Count);
        Assert.Contains(disciplines, d => d.GetProperty("name").GetString() == "Technology");
    }

    [Fact]
    public async Task Disciplines_GetById_FindsSeededDiscipline()
    {
        var token = await RegisterLearnerAsync("catalog.disciplinesbyid@example.com");

        var response = await AuthorizedClient(token).GetAsync("/api/disciplines/1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Science", body.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Disciplines_GetById_Missing_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("catalog.missing@example.com");

        var response = await AuthorizedClient(token).GetAsync("/api/disciplines/9999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Courses_Crud_EndToEnd()
    {
        var token = await RegisterLearnerAsync("catalog.courses@example.com");
        var authorized = AuthorizedClient(token);

        var courseId = await CreateCourseAsync(token);

        var getResponse = await authorized.GetAsync($"/api/courses/{courseId}");
        getResponse.EnsureSuccessStatusCode();
        var course = await ReadJsonAsync(getResponse);
        Assert.Equal("Modern Web Development", course.GetProperty("name").GetString());
        Assert.Equal(5000, course.GetProperty("price").GetInt32());

        var listResponse = await authorized.GetAsync("/api/courses");
        listResponse.EnsureSuccessStatusCode();
        var courses = (await ReadJsonAsync(listResponse)).EnumerateArray().ToList();
        Assert.Single(courses);
        Assert.Equal(courseId, courses[0].GetProperty("courseId").GetInt32());

        var updateResponse = await authorized.PutAsJsonAsync($"/api/courses/{courseId}", new
        {
            genreId = course.GetProperty("genreId").GetInt32(),
            name = "Advanced Web Development",
            technicalLevel = 5,
            description = "Advanced",
            price = 8000,
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await ReadJsonAsync(updateResponse);
        Assert.Equal("Advanced Web Development", updated.GetProperty("name").GetString());

        var deleteResponse = await authorized.DeleteAsync($"/api/courses/{courseId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var missingResponse = await authorized.GetAsync($"/api/courses/{courseId}");
        Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
    }

    [Fact]
    public async Task Courses_UpdateMissing_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("catalog.missingcourse@example.com");

        var response = await AuthorizedClient(token).PutAsJsonAsync("/api/courses/9999", new
        {
            genreId = 1,
            name = "Nope",
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Courses_DeleteMissing_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("catalog.deletemissing@example.com");

        var response = await AuthorizedClient(token).DeleteAsync("/api/courses/9999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
