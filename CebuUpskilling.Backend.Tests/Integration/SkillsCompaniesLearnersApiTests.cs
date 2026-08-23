using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Endpoint-level coverage for the skill parsing endpoint (POST /api/skills/parse)
/// and the positive paths of the company and learner listing endpoints, which the
/// existing suites only exercised through negative (forbidden) and unit-level tests.
/// </summary>
public class SkillsCompaniesLearnersApiTests : ProductionApiTestBase
{
    public SkillsCompaniesLearnersApiTests(ProductionApiFactory factory) : base(factory) { }

    // ------------------------------------------------------------------ //
    // POST /api/skills/parse
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task SkillsParse_LearnerWithResumeSkills_PersistsSkillsAndAssessments()
    {
        var token = await RegisterLearnerAsync("skills.parse.learner@example.com");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/skills/parse",
            new { resumeText = "I know React, Python and Docker." });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        var skills = body.GetProperty("skills").EnumerateArray().ToList();

        Assert.Equal(3, skills.Count);
        Assert.Equal(new[] { "Docker", "Python", "React" },
            skills.Select(s => s.GetProperty("skillName").GetString()).OrderBy(n => n).ToArray());
        Assert.All(skills, s =>
        {
            Assert.True(s.GetProperty("skillId").GetInt32() > 0);
            Assert.True(s.GetProperty("assessmentId").GetInt32() > 0);
        });

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(3, await db.LearnerSkills.CountAsync());
        Assert.Equal(3, await db.LearnerAssessments.CountAsync());
    }

    [Fact]
    public async Task SkillsParse_RepeatedCall_ReusesExistingAssessments()
    {
        var token = await RegisterLearnerAsync("skills.parse.repeat@example.com");

        var first = await AuthorizedClient(token).PostAsJsonAsync("/api/skills/parse", new { resumeText = "React" });
        first.EnsureSuccessStatusCode();

        var second = await AuthorizedClient(token).PostAsJsonAsync("/api/skills/parse", new { resumeText = "React" });

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var skills = (await ReadJsonAsync(second)).GetProperty("skills").EnumerateArray().ToList();
        Assert.Single(skills);
        Assert.Equal("React", skills[0].GetProperty("skillName").GetString());
        Assert.Equal(JsonValueKind.Null, skills[0].GetProperty("assessmentId").ValueKind);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await db.LearnerAssessments.CountAsync());
    }

    [Fact]
    public async Task SkillsParse_EmptyResume_ReturnsEmptySkills()
    {
        var token = await RegisterLearnerAsync("skills.parse.empty@example.com");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/skills/parse", new { resumeText = "   " });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Empty(body.GetProperty("skills").EnumerateArray().ToList());
    }

    [Fact]
    public async Task SkillsParse_RecruiterWithoutLearnerProfile_ReturnsSkillsWithoutAssessments()
    {
        var (token, _) = await RegisterRecruiterAsync("skills.parse.recruiter@example.com", "Acme Corp");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/skills/parse", new { resumeText = "Git" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var skills = (await ReadJsonAsync(response)).GetProperty("skills").EnumerateArray().ToList();
        Assert.Single(skills);
        Assert.Equal("Git", skills[0].GetProperty("skillName").GetString());
        Assert.True(skills[0].GetProperty("skillId").GetInt32() > 0);
        Assert.Equal(JsonValueKind.Null, skills[0].GetProperty("assessmentId").ValueKind);
    }

    // ------------------------------------------------------------------ //
    // GET /api/learners
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Learners_Get_ReturnsRegisteredLearners()
    {
        var token = await RegisterLearnerAsync("learners.list@example.com", "Frontend Developer");

        var response = await AuthorizedClient(token).GetAsync("/api/learners");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var learners = (await ReadJsonAsync(response)).EnumerateArray().ToList();
        Assert.Single(learners);
        Assert.Equal("Jose", learners[0].GetProperty("user").GetProperty("firstName").GetString());
        Assert.Equal("Learner", learners[0].GetProperty("user").GetProperty("role").GetString());
    }

    [Fact]
    public async Task Learners_Get_DoesNotExposePiiOrSecrets()
    {
        var token = await RegisterLearnerAsync("learners.list.pii@example.com", "Frontend Developer");

        var response = await AuthorizedClient(token).GetAsync("/api/learners");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var raw = await response.Content.ReadAsStringAsync();

        var forbidden = new[]
        {
            "emailAddress",
            "birthday",
            "address",
            "street",
            "city",
            "province",
            "zipCode",
            "country",
            "passwordHash",
            "emailConfirmationTokenHash",
            "emailConfirmationTokenExpiry",
            "passwordResetTokenHash",
            "passwordResetTokenExpiry",
        };

        foreach (var field in forbidden)
        {
            Assert.DoesNotContain($"\"{field}\"", raw, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task Learners_Get_WithoutAuth_ReturnsUnauthorized()
    {
        var response = await Client.GetAsync("/api/learners");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // GET/POST /api/companies
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Companies_Get_ReturnsSeededCompany()
    {
        var (token, companyId) = await RegisterRecruiterAsync("companies.list@example.com", "Acme Corp");

        var response = await AuthorizedClient(token).GetAsync("/api/companies");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var companies = (await ReadJsonAsync(response)).EnumerateArray().ToList();
        Assert.Single(companies);
        Assert.Equal(companyId, companies[0].GetProperty("companyId").GetInt32());
        Assert.Equal("Acme Corp", companies[0].GetProperty("name").GetString());
    }

    [Fact]
    public async Task Companies_Create_RecruiterCreatesCompany()
    {
        var (token, _) = await RegisterRecruiterAsync("companies.create@example.com", "Acme Corp");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/companies", new { name = "Second Corp" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.True(body.GetProperty("companyId").GetInt32() > 0);
        Assert.Equal("Second Corp", body.GetProperty("name").GetString());
        Assert.Equal("/api/companies/" + body.GetProperty("companyId").GetInt32(), response.Headers.Location?.ToString());
    }

    [Fact]
    public async Task Companies_Create_MissingName_ReturnsBadRequest()
    {
        var (token, _) = await RegisterRecruiterAsync("companies.create.bad@example.com", "Acme Corp");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/companies", new { name = "" });

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
}