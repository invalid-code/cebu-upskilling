using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.Text.Json;

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
        var authorized = AuthorizedClient(token);

        var subDisciplineResponse = await authorized.PostAsJsonAsync("/api/subdisciplines", new
        {
            disciplineId = 1,
            name = "Computer Science",
            description = "CS",
        });
        await EnsureSuccessAsync(subDisciplineResponse);
        var subDiscipline = await ReadJsonAsync(subDisciplineResponse);
        var subDisciplineId = subDiscipline.GetProperty("subDisciplineId").GetInt32();

        var genreResponse = await authorized.PostAsJsonAsync("/api/genres", new
        {
            subDisciplineId,
            name = "Web Development",
            description = "Web",
        });
        await EnsureSuccessAsync(genreResponse);
        var genre = await ReadJsonAsync(genreResponse);
        var genreId = genre.GetProperty("genreId").GetInt32();

        var courseResponse = await authorized.PostAsJsonAsync("/api/courses", new
        {
            genreId,
            name = "Modern Web Development",
            technicalLevel = 3,
            description = "Build production-ready web apps",
            price = 5000,
        });
        await EnsureSuccessAsync(courseResponse);
        var course = await ReadJsonAsync(courseResponse);
        return course.GetProperty("courseId").GetInt32();
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode) return;
        var body = await response.Content.ReadAsStringAsync();
        throw new InvalidOperationException($"{response.StatusCode} {(int)response.StatusCode}: {body}");
    }
}
