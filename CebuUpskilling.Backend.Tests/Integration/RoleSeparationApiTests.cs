using System.Net;
using System.Net.Http.Json;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Verifies strict role separation between Recruiter (Employer) and Learner
/// accounts: Recruiters are forbidden from learner-only endpoints and write
/// endpoints, and Learners are forbidden from recruiter-managed resources.
/// </summary>
public class RoleSeparationApiTests : ProductionApiTestBase
{
    public RoleSeparationApiTests(ProductionApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Recruiter_LearnerEndpoints_ReturnForbidden()
    {
        var (token, _) = await RegisterRecruiterAsync("separation.recruiter@example.com", "Acme Corp");
        var authorized = AuthorizedClient(token);

        using var gapsResp = await authorized.GetAsync("/api/skillgaps");
        Assert.Equal(HttpStatusCode.Forbidden, gapsResp.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.GetAsync("/api/assessments/recommended")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.GetAsync("/api/assessments/results")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.GetAsync("/api/enrollments")).StatusCode);

        var courseId = await CreateCourseAsync(token);
        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.PostAsJsonAsync("/api/enrollments", new { courseId })).StatusCode);

        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.GetAsync("/api/stats/week")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.GetAsync("/api/learners")).StatusCode);
    }

    [Fact]
    public async Task Learner_LearnerEndpoints_StillWork()
    {
        var token = await RegisterLearnerAsync("separation.learner@example.com");

        Assert.Equal(HttpStatusCode.OK, (await AuthorizedClient(token).GetAsync("/api/skillgaps")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await AuthorizedClient(token).GetAsync("/api/stats/week")).StatusCode);
    }

    [Fact]
    public async Task Learner_PostWriteEndpoints_ReturnForbidden()
    {
        var token = await RegisterLearnerAsync("separation.learnerwrite@example.com");
        var authorized = AuthorizedClient(token);

        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.PostAsJsonAsync("/api/posts", new
        {
            recruiterId = 1,
            companyId = 1,
            title = "Nope",
            description = "Learners cannot post jobs",
        })).StatusCode);

        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.PutAsJsonAsync("/api/posts/1", new
        {
            postId = 1,
            title = "Nope",
        })).StatusCode);

        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.DeleteAsync("/api/posts/1")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.PostAsJsonAsync("/api/companies", new { name = "Nope" })).StatusCode);
    }

    [Fact]
    public async Task Learner_GetPosts_StillAllowed()
    {
        var token = await RegisterLearnerAsync("separation.learnerposts@example.com");

        var response = await AuthorizedClient(token).GetAsync("/api/posts");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await ReadJsonAsync(response)).GetProperty("items").EnumerateArray().ToList());
    }

    [Fact]
    public async Task Learner_GetCompanies_IsAllowed()
    {
        var token = await RegisterLearnerAsync("separation.learnercompanies@example.com");

        var response = await AuthorizedClient(token).GetAsync("/api/companies");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await ReadJsonAsync(response)).EnumerateArray().ToList());
    }

    [Fact]
    public async Task Learner_CreateCompany_IsForbidden()
    {
        var token = await RegisterLearnerAsync("separation.learnercreatecompany@example.com");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/companies", new { name = "Nope Corp" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Recruiter_PostWriteEndpoints_RemainAllowed()
    {
        var (token, companyId) = await RegisterRecruiterAsync("separation.recruiterposts@example.com", "Acme Corp");
        var authorized = AuthorizedClient(token);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var postResponse = await authorized.PostAsJsonAsync("/api/posts", new
            {
                title = "Senior Backend Developer",
                description = "Cebu City\nsalary: ₱120,000 - ₱180,000\nskills: Node.js, Python\nmatch: 85%",
            });
            Assert.Equal(HttpStatusCode.Created, postResponse.StatusCode);
        }

        var listResponse = await authorized.GetAsync("/api/posts");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var posts = (await ReadJsonAsync(listResponse)).GetProperty("items").EnumerateArray().ToList();
        Assert.Single(posts);
        Assert.Equal("Senior Backend Developer", posts[0].GetProperty("title").GetString());
    }

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