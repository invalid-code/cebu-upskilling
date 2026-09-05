using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CebuUpskilling.Backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Coverage for the richer company identity feature: public company profile
/// reads, recruiter-owned profile updates, logo upload with per-post logo
/// fallback, and rich company fields captured during registration.
/// </summary>
public class CompanyIdentityApiTests : ProductionApiTestBase
{
    public CompanyIdentityApiTests(ProductionApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Companies_GetById_WithoutAuth_ReturnsPublicProfile()
    {
        var (_, companyId) = await RegisterRecruiterAsync("company.public@example.com", "Island Bites");

        var response = await Client.GetAsync($"/api/companies/{companyId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal(companyId, body.GetProperty("companyId").GetInt32());
        Assert.Equal("Island Bites", body.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("logoUrl").ValueKind);
    }

    [Fact]
    public async Task Companies_GetById_UnknownCompany_ReturnsNotFound()
    {
        var response = await Client.GetAsync("/api/companies/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Companies_PutMe_UpdatesProfileAndPersists()
    {
        var (token, companyId) = await RegisterRecruiterAsync("company.update@example.com", "Cebu Prints");

        var response = await AuthorizedClient(token).PutAsJsonAsync("/api/companies/me", new
        {
            industry = "Apparel",
            website = "https://cebuprints.example.com",
            location = "Cebu City",
            companySize = "11-50",
            description = "Custom shirts printed in Cebu.",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Apparel", body.GetProperty("industry").GetString());
        Assert.Equal("11-50", body.GetProperty("companySize").GetString());

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var company = await db.Companies.FirstAsync(c => c.CompanyId == companyId);
        Assert.Equal("https://cebuprints.example.com", company.Website);
        Assert.Equal("Custom shirts printed in Cebu.", company.Description);
    }

    [Fact]
    public async Task Companies_PutMe_Learner_IsForbidden()
    {
        var token = await RegisterLearnerAsync("company.put.learner@example.com");

        var response = await AuthorizedClient(token).PutAsJsonAsync("/api/companies/me", new { industry = "Tech" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Companies_GetById_DoesNotLeakInternalFields()
    {
        var (_, companyId) = await RegisterRecruiterAsync("company.leak@example.com", "Safe Co");

        var raw = await Client.GetStringAsync($"/api/companies/{companyId}");

        Assert.DoesNotContain("passwordHash", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("emailAddress", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Companies_UploadLogo_SetsLogoUrl_AndPostResponseUsesFallback()
    {
        var (token, companyId) = await RegisterRecruiterAsync("company.logo@example.com", "Logo Labs");

        var logoResponse = await UploadLogoAsync(AuthorizedClient(token), "logo.png");
        Assert.Equal(HttpStatusCode.OK, logoResponse.StatusCode);
        var logoBody = await ReadJsonAsync(logoResponse);
        var logoUrl = logoBody.GetProperty("logoUrl").GetString();
        Assert.False(string.IsNullOrWhiteSpace(logoUrl));

        // The uploaded logo is persisted on the company row.
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var company = await db.Companies.FirstAsync(c => c.CompanyId == companyId);
            Assert.Equal(logoUrl, company.LogoUrl);
        }

        // A post created without its own logo inherits the company logo.
        var postResponse = await AuthorizedClient(token).PostAsJsonAsync("/api/posts", new
        {
            title = "Print Assistant",
            description = "Help run the print shop floor.",
        });
        postResponse.EnsureSuccessStatusCode();
        var postBody = await ReadJsonAsync(postResponse);
        Assert.Equal(logoUrl, postBody.GetProperty("companyLogoUrl").GetString());

        // Anonymous visitors can list the company's active posts.
        var postsResponse = await Client.GetAsync($"/api/companies/{companyId}/posts");
        Assert.Equal(HttpStatusCode.OK, postsResponse.StatusCode);
        var posts = await ReadJsonAsync(postsResponse);
        Assert.Equal(1, posts.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task Companies_UploadLogo_CompanyLevelLogoTakesPrecedenceOverLegacyPostValue()
    {
        var (token, companyId) = await RegisterRecruiterAsync("company.logo2@example.com", "Fallback Works");

        var logoResponse = await UploadLogoAsync(AuthorizedClient(token), "logo.png");
        logoResponse.EnsureSuccessStatusCode();
        var logoUrl = (await ReadJsonAsync(logoResponse)).GetProperty("logoUrl").GetString();

        var postResponse = await AuthorizedClient(token).PostAsJsonAsync("/api/posts", new
        {
            title = "Designer",
            description = "Design work.",
            companyLogoUrl = "https://cdn.example.com/custom-banner.png",
        });
        postResponse.EnsureSuccessStatusCode();
        var postBody = await ReadJsonAsync(postResponse);

        // Company-level logo takes precedence over a legacy per-post value.
        Assert.Equal(logoUrl, postBody.GetProperty("companyLogoUrl").GetString());
        Assert.Equal(companyId, postBody.GetProperty("companyId").GetInt32());
    }

    [Fact]
    public async Task Companies_UploadLogo_NonImage_ReturnsBadRequest()
    {
        var (token, _) = await RegisterRecruiterAsync("company.logo.bad@example.com", "Pixel Rejects");

        var response = await UploadLogoAsync(AuthorizedClient(token), "malware.pdf", "%PDF-1.7 fake pdf bytes");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Companies_UploadLogo_FakeImageContent_ReturnsBadRequest()
    {
        var (token, _) = await RegisterRecruiterAsync("company.logo.fake@example.com", "Fake Pixels");

        var response = await UploadLogoAsync(AuthorizedClient(token), "logo.png", "not an image at all");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Companies_UploadLogo_Oversized_ReturnsBadRequest()
    {
        var (token, _) = await RegisterRecruiterAsync("company.logo.big@example.com", "Big Pixels");

        var pngHeader = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        var content = new byte[3 * 1024 * 1024];
        pngHeader.CopyTo(content, 0);

        var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(content) { Headers = { ContentType = new MediaTypeHeaderValue("image/png") } };
        form.Add(fileContent, "file", "huge.png");
        var response = await AuthorizedClient(token).PostAsync("/api/companies/me/logo", form);

        Assert.True(
            response.StatusCode == HttpStatusCode.BadRequest
            || response.StatusCode == HttpStatusCode.RequestEntityTooLarge,
            $"Expected 400 or 413 but got {response.StatusCode}");
    }

    [Fact]
    public async Task RegisterCompany_WithRichFields_PersistsCompanyProfile()
    {
        var registration = await RegisterCompanyAsync(new
        {
            companyName = "Rich Registration Inc",
            firstName = "Rina",
            lastName = "Reyes",
            emailAddress = "rich.register@example.com",
            password = "P@ssw0rd!",
            companyIndustry = "Logistics",
            companyWebsite = "https://richreg.example.com",
            companyLocation = "Mandaue City",
            companySize = "1-10",
            companyDescription = "Bike courier collective serving metro Cebu.",
        });
        registration.EnsureSuccessStatusCode();
        var companyId = (await ReadJsonAsync(registration)).GetProperty("companyId").GetInt32();

        var profile = await Client.GetAsync($"/api/companies/{companyId}");
        profile.EnsureSuccessStatusCode();
        var body = await ReadJsonAsync(profile);

        Assert.Equal("Logistics", body.GetProperty("industry").GetString());
        Assert.Equal("https://richreg.example.com", body.GetProperty("website").GetString());
        Assert.Equal("Mandaue City", body.GetProperty("location").GetString());
        Assert.Equal("1-10", body.GetProperty("companySize").GetString());
        Assert.Equal("Bike courier collective serving metro Cebu.", body.GetProperty("description").GetString());
    }

    [Fact]
    public async Task RegisterCompany_WithInvalidWebsite_ReturnsBadRequest()
    {
        var registration = await RegisterCompanyAsync(new
        {
            companyName = "Bad Website Co",
            firstName = "Bea",
            lastName = "Bad",
            emailAddress = "bad.website@example.com",
            password = "P@ssw0rd!",
            companyWebsite = "not-a-url",
        });

        Assert.Equal(HttpStatusCode.BadRequest, registration.StatusCode);
    }

    [Fact]
    public async Task Companies_Create_DuplicateName_ReturnsBadRequest()
    {
        var (token, _) = await RegisterRecruiterAsync("company.dup@example.com", "Unique Name Corp");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/companies", new { name = "Unique Name Corp" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Helpers
    // ------------------------------------------------------------------ //

    private async Task<(string token, int companyId)> RegisterRecruiterAsync(string email, string companyName)
    {
        using var registration = await RegisterCompanyAsync(new
        {
            companyName,
            firstName = "Employer",
            lastName = "Corp",
            emailAddress = email,
            password = "P@ssw0rd!",
        });
        registration.EnsureSuccessStatusCode();
        var body = await ReadJsonAsync(registration);
        return (body.GetProperty("token").GetString()!, body.GetProperty("companyId").GetInt32());
    }

    private static readonly byte[] TinyPngBytes = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    private static Task<HttpResponseMessage> UploadLogoAsync(HttpClient client, string fileName, string? contentOverride = null)
    {
        var bytes = contentOverride != null
            ? Encoding.UTF8.GetBytes(contentOverride)
            : TinyPngBytes;
        var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes) { Headers = { ContentType = new MediaTypeHeaderValue("image/png") } };
        form.Add(fileContent, "file", fileName);
        return client.PostAsync("/api/companies/me/logo", form);
    }
}
