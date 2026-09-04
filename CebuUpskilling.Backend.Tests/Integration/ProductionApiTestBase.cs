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
        using var context = Factory.CreateDbContext();
        TestDataSeeder.Seed(context);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    protected async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    private static byte[] CreateFakePdfBytes(string text)
    {
        var sb = new System.Text.StringBuilder();
        sb.Append("%PDF-1.4\n");
        sb.Append("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n");
        sb.Append("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n");
        sb.Append("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >> endobj\n");
        var content = $"BT /F1 12 Tf 50 700 Td ({text.Replace("(", "\\(").Replace(")", "\\)")}) Tj ET";
        sb.Append($"4 0 obj << /Length {content.Length} >> stream\n{content}\nendstream endobj\n");
        sb.Append("xref\n0 5\n0000000000 65535 f\n");
        sb.Append("trailer << /Size 5 /Root 1 0 R >>\nstartxref\n0\n%%EOF");
        return System.Text.Encoding.UTF8.GetBytes(sb.ToString());
    }

    protected Task<HttpResponseMessage> RegisterAsync(object request)
    {
        var type = request.GetType();
        var resumeProp = type.GetProperty("resume");
        var resumeVal = resumeProp?.GetValue(request) as string;
        var roleProp = type.GetProperty("role");
        var roleVal = roleProp?.GetValue(request) as string;
        // If a resume string is supplied for a Learner, convert to multipart with a real PDF file so magic-byte validation passes
        if (!string.IsNullOrWhiteSpace(resumeVal) && string.Equals(roleVal, "Learner", StringComparison.OrdinalIgnoreCase))
        {
            var form = new MultipartFormDataContent();
            foreach (var prop in type.GetProperties())
            {
                if (prop.Name == "resume") continue;
                var val = prop.GetValue(request);
                if (val == null) continue;
                form.Add(new StringContent(val.ToString()!), prop.Name);
            }
            var pdfBytes = CreateFakePdfBytes(resumeVal!);
            var fileContent = new ByteArrayContent(pdfBytes);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
            form.Add(fileContent, "resumeFile", "resume.pdf");
            return Client.PostAsync("/api/auth/register", form);
        }
        return Client.PostAsJsonAsync("/api/auth/register", request);
    }

    protected Task<HttpResponseMessage> RegisterCompanyAsync(object request) =>
        Client.PostAsJsonAsync("/api/auth/register-company", request);

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
            resume = "Experienced software developer with 5+ years in web development.",
        });
        response.EnsureSuccessStatusCode();

        var body = await ReadJsonAsync(response);
        return body.GetProperty("token").GetString()!;
    }

    protected async Task<int> CreateCourseAsync(string token, string name = "Modern Web Development")
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
            Name = name,
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
