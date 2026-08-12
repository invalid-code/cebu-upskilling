using System.Net;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CebuUpskilling.Backend.Tests.Integration;

public class BusinessStatsApiTests : ProductionApiTestBase
{
    public BusinessStatsApiTests(ProductionApiFactory factory) : base(factory) { }

    [Fact]
    public async Task BusinessStats_AsRecruiter_ReturnsCompanyAggregates()
    {
        var (token, companyId) = await RegisterRecruiterAsync("business.stats@example.com", "Acme Corp");
        await AddPostAsync(companyId, "Frontend Developer", includeRequiredCourse: true);

        var response = await AuthorizedClient(token).GetAsync("/api/stats/business");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Acme Corp", body.GetProperty("company").GetProperty("name").GetString());
        Assert.Equal(1, body.GetProperty("company").GetProperty("jobPostings").GetInt32());
        Assert.Equal("Frontend Developer", body.GetProperty("jobPostings")[0].GetProperty("title").GetString());
        Assert.Equal("Business dashboard essentials", body.GetProperty("jobPostings")[0]
            .GetProperty("requiredCourses")[0].GetProperty("name").GetString());
        Assert.NotEmpty(body.GetProperty("skillDemand").EnumerateArray());
    }

    [Fact]
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

    [Fact]
    public async Task BusinessStats_RejectsLearners_AndRecruitersWithoutCompanies()
    {
        var learnerToken = await RegisterLearnerAsync("business.learner@example.com");
        Assert.Equal(HttpStatusCode.Forbidden, (await AuthorizedClient(learnerToken).GetAsync("/api/stats/business")).StatusCode);

        var recruiterResponse = await RegisterAsync(new
        {
            firstName = "No", lastName = "Company", emailAddress = "business.none@example.com",
            password = "P@ssw0rd!", role = "Recruiter",
        });
        var recruiterToken = (await ReadJsonAsync(recruiterResponse)).GetProperty("token").GetString()!;
        Assert.Equal(HttpStatusCode.BadRequest, (await AuthorizedClient(recruiterToken).GetAsync("/api/stats/business")).StatusCode);
    }

    private async Task<(string token, int companyId)> RegisterRecruiterAsync(string email, string companyName)
    {
        var registration = await RegisterAsync(new
        {
            firstName = "Employer", lastName = "Corp", emailAddress = email,
            password = "P@ssw0rd!", role = "Recruiter",
        });
        registration.EnsureSuccessStatusCode();
        var body = await ReadJsonAsync(registration);
        var userId = body.GetProperty("userId").GetInt32();

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var company = new Company { Name = companyName };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        db.Recruiters.Add(new Recruiter { UserId = userId, CompanyId = company.CompanyId });
        await db.SaveChangesAsync();

        return (body.GetProperty("token").GetString()!, company.CompanyId);
    }

    private async Task AddPostAsync(int companyId, string title, bool includeRequiredCourse = false)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var recruiter = await db.Recruiters.FirstAsync(r => r.CompanyId == companyId);
        var post = new Post { CompanyId = companyId, RecruiterId = recruiter.RecruiterId, Title = title };
        db.Posts.Add(post);
        if (includeRequiredCourse)
        {
            var subDiscipline = new SubDiscipline { DisciplineId = 3, Name = "Dashboard testing" };
            var genre = new Genre { SubDiscipline = subDiscipline, Name = "Employer learning" };
            var course = new Course
            {
                Genre = genre,
                Name = "Business dashboard essentials",
                TechnicalLevel = 8,
                Mode = "Online",
            };
            db.Courses.Add(course);
            await db.SaveChangesAsync();
            db.PostCourseRequireds.Add(new PostCourseRequired { PostId = post.PostId, CourseId = course.CourseId });
        }
        await db.SaveChangesAsync();
    }
}
