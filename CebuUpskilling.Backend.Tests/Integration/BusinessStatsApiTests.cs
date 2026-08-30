using System.Net;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CebuUpskilling.Backend.Tests.Integration;

public class BusinessStatsApiTests : ProductionApiTestBase
{
    public BusinessStatsApiTests(ProductionApiFactory factory) : base(factory) { }

    [RequiresPostgresFact]
    public async Task BusinessStats_AsRecruiter_ReturnsCompanyAggregates()
    {
        var (token, companyId) = await RegisterRecruiterAsync("business.stats@example.com", "Acme Corp");
        await AddPostAsync(companyId, "Frontend Developer");

        var response = await AuthorizedClient(token).GetAsync("/api/stats/business");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Acme Corp", body.GetProperty("company").GetProperty("name").GetString());
        Assert.Equal(1, body.GetProperty("company").GetProperty("jobPostings").GetInt32());
        var posting = body.GetProperty("jobPostings")[0];
        Assert.Equal("Frontend Developer", posting.GetProperty("title").GetString());
        Assert.Equal("Full-time", posting.GetProperty("jobType").GetString());
        Assert.Equal("Cebu City", posting.GetProperty("location").GetString());
        Assert.NotEmpty(body.GetProperty("skillDemand").EnumerateArray());
    }

    [RequiresPostgresFact]
    public async Task BusinessStats_IsScopedToTheRecruitersCompany()
    {
        var (firstToken, firstCompanyId) = await RegisterRecruiterAsync("business.first@example.com", "First Co");
        var (_, secondCompanyId) = await RegisterRecruiterAsync("business.second@example.com", "Second Co");
        await AddPostAsync(firstCompanyId, "First role");
        await AddPostAsync(secondCompanyId, "Second role");

        var body = await ReadJsonAsync(await AuthorizedClient(firstToken).GetAsync("/api/stats/business"));
        var postings = body.GetProperty("jobPostings").EnumerateArray().ToList();

        Assert.Single(postings);
        Assert.Equal("First role", postings[0].GetProperty("title").GetString());
    }

    [RequiresPostgresFact]
    public async Task BusinessStats_RejectsLearners_AndRecruitersWithoutCompanies()
    {
        var learnerToken = await RegisterLearnerAsync("business.learner@example.com");
        Assert.Equal(HttpStatusCode.Forbidden, (await AuthorizedClient(learnerToken).GetAsync("/api/stats/business")).StatusCode);

        // Self-service Recruiter registration is rejected outright...
        var recruiterResponse = await RegisterAsync(new
        {
            firstName = "No",
            lastName = "Company",
            emailAddress = "business.none@example.com",
            password = "P@ssw0rd!",
            role = "Recruiter",
        });
        Assert.Equal(HttpStatusCode.BadRequest, recruiterResponse.StatusCode);

        // ...and a recruiter account without a company (seeded directly) still gets 400.
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Users.Add(new CebuUpskilling.Backend.Entities.AppUser
        {
            FirstName = "No",
            LastName = "Company",
            EmailAddress = "business.none.seeded@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("P@ssw0rd!"),
            Role = "Recruiter",
        });
        await db.SaveChangesAsync();
        var login = await LoginAsync(new { emailAddress = "business.none.seeded@example.com", password = "P@ssw0rd!" });
        var loginBody = await ReadJsonAsync(login);
        var orphanToken = loginBody.GetProperty("token").GetString()!;
        Assert.Equal(HttpStatusCode.BadRequest, (await AuthorizedClient(orphanToken).GetAsync("/api/stats/business")).StatusCode);
    }

    private async Task<(string token, int companyId)> RegisterRecruiterAsync(string email, string companyName)
    {
        var registration = await RegisterCompanyAsync(new
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

    private async Task AddPostAsync(int companyId, string title)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var post = new Post
        {
            CompanyId = companyId,
            Title = title,
            Location = "Cebu City",
            JobType = "Full-time",
            ExperienceLevel = "Mid",
            IsActive = true,
        };
        db.Posts.Add(post);
        await db.SaveChangesAsync();
    }
}
