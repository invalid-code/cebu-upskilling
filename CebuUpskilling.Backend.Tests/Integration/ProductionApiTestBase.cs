using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.Text.Json;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Base class for production-style HTTP integration tests. Each test gets a
/// freshly truncated database so runs are isolated from each other.
/// </summary>
public abstract class ProductionApiTestBase : IClassFixture<ProductionApiFactory>, IAsyncLifetime
{
    protected ProductionApiFactory Factory { get; }
    protected HttpClient Client { get; }

    protected ProductionApiTestBase(ProductionApiFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        await Factory.EnsureMigratedAsync();
        await Factory.ResetDatabaseAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    protected async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    protected Task<HttpResponseMessage> RegisterAsync(object request) =>
        Client.PostAsJsonAsync("/api/auth/register", request);

    protected Task<HttpResponseMessage> LoginAsync(object request) =>
        Client.PostAsJsonAsync("/api/auth/login", request);

    /// <summary>Returns a fresh client authenticated as the given user token.</summary>
    protected HttpClient AuthorizedClient(string token)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    protected async Task<string> RegisterLearnerAsync(string email, string? targetRole = null)
    {
        var response = await RegisterAsync(new
        {
            firstName = "Jose",
            lastName = "Rizal",
            emailAddress = email,
            password = "P@ssw0rd!",
            role = "Learner",
            targetRole,
        });
        response.EnsureSuccessStatusCode();

        var body = await ReadJsonAsync(response);
        return body.GetProperty("token").GetString()!;
    }

    protected async Task<int> CreateCourseAsync(string token)
    {
        using var context = Factory.CreateDbContext();

        var subDiscipline = new SubDiscipline
        {
            DisciplineId = 1,
            Name = "Computer Science",
            Description = "CS",
        };
        context.SubDisciplines.Add(subDiscipline);
        await context.SaveChangesAsync();

        var genre = new Genre
        {
            SubDisciplineId = subDiscipline.SubDisciplineId,
            Name = "Web Development",
            Description = "Web",
        };
        context.Genres.Add(genre);
        await context.SaveChangesAsync();

        var course = new Course
        {
            GenreId = genre.GenreId,
            Name = "Modern Web Development",
            TechnicalLevel = 3,
            Description = "Build production-ready web apps",
            Price = 5000,
        };
        context.Courses.Add(course);
        await context.SaveChangesAsync();

        return course.CourseId;
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode) return;
        var body = await response.Content.ReadAsStringAsync();
        throw new InvalidOperationException($"{response.StatusCode} {(int)response.StatusCode}: {body}");
    }
}
