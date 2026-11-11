using System.Net;
using System.Net.Http.Headers;

namespace CebuUpskilling.Backend.Tests.Integration;

public class DuplicateCacheApiFactory : ProductionApiFactory
{
    public DuplicateCacheApiFactory()
    {
        EnableDuplicateCache = true;
    }
}

public class DuplicateRequestCacheApiTests : IClassFixture<DuplicateCacheApiFactory>, IAsyncLifetime
{
    private readonly DuplicateCacheApiFactory _factory;

    public DuplicateRequestCacheApiTests(DuplicateCacheApiFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.EnsureMigratedAsync();
        await _factory.ResetDatabaseAsync();
        using var context = _factory.CreateDbContext();
        TestDataSeeder.Seed(context);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<string> RegisterLearnerAsync(string email)
    {
        var client = _factory.CreateClient();
        var form = new MultipartFormDataContent
        {
            { new StringContent("Jose"), "firstName" },
            { new StringContent("Rizal"), "lastName" },
            { new StringContent(email), "emailAddress" },
            { new StringContent("P@ssw0rd!"), "password" },
            { new StringContent("Learner"), "role" },
        };
        var pdfBytes = CreateFakePdfBytes("Experienced software developer with 5+ years in web development.");
        var fileContent = new ByteArrayContent(pdfBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        form.Add(fileContent, "resumeFile", "resume.pdf");
        var response = await client.PostAsync("/api/auth/register", form);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        using var doc = System.Text.Json.JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("token").GetString()!;
    }

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

    private HttpClient AuthorizedClient(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task DuplicateGet_ServedFromCache_WithHitHeader()
    {
        var token = await RegisterLearnerAsync($"dup.cache.{Guid.NewGuid():N}@example.com");
        var client = AuthorizedClient(token);

        var first = await client.GetAsync("/api/skillgaps");
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var firstBody = await first.Content.ReadAsStringAsync();
        Assert.Equal("MISS", first.Headers.GetValues("X-Cache").Single());

        var second = await client.GetAsync("/api/skillgaps");
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal("HIT", second.Headers.GetValues("X-Cache").Single());
        Assert.Equal(firstBody, await second.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task DuplicateGet_DifferentUser_DoesNotHit()
    {
        var tokenA = await RegisterLearnerAsync($"dup.a.{Guid.NewGuid():N}@example.com");
        var tokenB = await RegisterLearnerAsync($"dup.b.{Guid.NewGuid():N}@example.com");

        var first = await AuthorizedClient(tokenA).GetAsync("/api/skillgaps");
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await AuthorizedClient(tokenB).GetAsync("/api/skillgaps");
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        // Different identity scope -> must not serve A's cached body.
        Assert.Equal("MISS", second.Headers.GetValues("X-Cache").Single());
    }
}
