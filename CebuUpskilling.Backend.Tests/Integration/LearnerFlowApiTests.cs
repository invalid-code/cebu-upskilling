using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CebuUpskilling.Backend.Tests.Integration;

public class LearnerFlowApiTests : ProductionApiTestBase
{
    public LearnerFlowApiTests(ProductionApiFactory factory) : base(factory) { }

    private async Task<(int UserId, int LearnerId)> GetLearnerIdsAsync(string email)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var user = await db.Users.SingleAsync(u => u.EmailAddress == email);
        var learner = await db.Learners.SingleAsync(l => l.UserId == user.UserId);
        return (user.UserId, learner.LearnerId);
    }

    [Fact]
    public async Task SkillGaps_WithTargetRole_ReturnsRoleSkillsAsGaps()
    {
        var token = await RegisterLearnerAsync("flow.gaps@example.com", "Frontend Developer");

        var response = await AuthorizedClient(token).GetAsync("/api/skillgaps");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var gaps = (await ReadJsonAsync(response)).EnumerateArray().ToList();

        Assert.Equal(7, gaps.Count);
        var javascript = gaps.Single(g => g.GetProperty("skillName").GetString() == "JavaScript");
        Assert.Equal(4, javascript.GetProperty("requiredLevel").GetInt32());
        Assert.Equal(0, javascript.GetProperty("currentLevel").GetInt32());
        Assert.Equal(4, javascript.GetProperty("gap").GetInt32());
        Assert.False(javascript.GetProperty("verified").GetBoolean());
    }

    [Fact]
    public async Task SkillGaps_WithoutTargetRole_ReturnsEmpty()
    {
        var token = await RegisterLearnerAsync("flow.norole@example.com");

        var response = await AuthorizedClient(token).GetAsync("/api/skillgaps");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var gaps = (await ReadJsonAsync(response)).EnumerateArray().ToList();
        Assert.Empty(gaps);
    }

    [Fact]
    public async Task SkillGaps_WhenAllSkillsMatched_ReturnsZeroGaps()
    {
        var email = "flow.matched@example.com";
        await RegisterLearnerAsync(email, "Frontend Developer");
        var (_, learnerId) = await GetLearnerIdsAsync(email);
        await SetAllRoleSkillsToRequiredAsync(learnerId);

        var token = await LoginTokenAsync(email);
        var response = await AuthorizedClient(token).GetAsync("/api/skillgaps");
        response.EnsureSuccessStatusCode();

        var gaps = (await ReadJsonAsync(response)).EnumerateArray().ToList();
        Assert.All(gaps, g => Assert.Equal(0, g.GetProperty("gap").GetInt32()));
    }

    [Fact]
    public async Task RecommendedAssessment_TopGap_IsReturned()
    {
        var token = await RegisterLearnerAsync("flow.recommended@example.com", "Frontend Developer");

        var response = await AuthorizedClient(token).GetAsync("/api/assessments/recommended");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("HTML", body.GetProperty("skillName").GetString());
        Assert.Equal(4, body.GetProperty("gap").GetInt32());
        Assert.Equal(4, body.GetProperty("targetLevel").GetInt32());
        Assert.Equal("Advanced", body.GetProperty("targetLevelLabel").GetString());
    }

    [Fact]
    public async Task RecommendedAssessment_NoTargetRole_ReturnsNull()
    {
        var token = await RegisterLearnerAsync("flow.norecommendation@example.com");

        var response = await AuthorizedClient(token).GetAsync("/api/assessments/recommended");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(string.Empty, (await response.Content.ReadAsStringAsync()).Trim());
    }

    [Fact]
    public async Task RecommendedAssessment_NoGapsRemaining_ReturnsNull()
    {
        var email = "flow.nogaps@example.com";
        await RegisterLearnerAsync(email, "Frontend Developer");
        var (_, learnerId) = await GetLearnerIdsAsync(email);
        await SetAllRoleSkillsToRequiredAsync(learnerId);

        var token = await LoginTokenAsync(email);
        var response = await AuthorizedClient(token).GetAsync("/api/assessments/recommended");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(string.Empty, (await response.Content.ReadAsStringAsync()).Trim());
    }

    [Fact]
    public async Task AssessmentResults_OnlyVerified_OrderedNewestFirst()
    {
        var email = "flow.results@example.com";
        await RegisterLearnerAsync(email, "Frontend Developer");
        var (_, learnerId) = await GetLearnerIdsAsync(email);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            db.LearnerAssessments.AddRange(
                new LearnerAssessment
                {
                    LearnerId = learnerId,
                    SkillId = 1,
                    ScoredLevel = 4,
                    Verified = true,
                    CompletedAt = new DateTime(2026, 1, 15, 10, 0, 0, DateTimeKind.Utc),
                },
                new LearnerAssessment
                {
                    LearnerId = learnerId,
                    SkillId = 3,
                    ScoredLevel = 3,
                    Verified = true,
                    CompletedAt = new DateTime(2026, 2, 20, 14, 30, 0, DateTimeKind.Utc),
                },
                new LearnerAssessment
                {
                    LearnerId = learnerId,
                    SkillId = 2,
                    ScoredLevel = 2,
                    Verified = false,
                    CompletedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                });

            await db.SaveChangesAsync();
        }

        var token = await LoginTokenAsync(email);
        var response = await AuthorizedClient(token).GetAsync("/api/assessments/results");
        response.EnsureSuccessStatusCode();

        var results = (await ReadJsonAsync(response)).EnumerateArray().ToList();
        Assert.Equal(2, results.Count);
        Assert.Equal("React", results[0].GetProperty("skillName").GetString());
        Assert.Equal("JavaScript", results[1].GetProperty("skillName").GetString());
        Assert.True(results[0].GetProperty("verified").GetBoolean());
        Assert.Equal("Intermediate", results[0].GetProperty("levelLabel").GetString());
        Assert.Equal("Advanced", results[1].GetProperty("levelLabel").GetString());
    }

    [Fact]
    public async Task AssessmentResults_WithoutAssessments_ReturnsEmpty()
    {
        var token = await RegisterLearnerAsync("flow.noresults@example.com");

        var response = await AuthorizedClient(token).GetAsync("/api/assessments/results");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await ReadJsonAsync(response)).EnumerateArray().ToList());
    }

    [Fact]
    public async Task Enrollments_EnrollListAndReEnroll()
    {
        var token = await RegisterLearnerAsync("flow.enroll@example.com");
        var courseId = await CreateCourseAsync(token);
        var authorized = AuthorizedClient(token);

        var enrollResponse = await authorized.PostAsJsonAsync("/api/enrollments", new { courseId });
        Assert.Equal(HttpStatusCode.Created, enrollResponse.StatusCode);

        var listResponse = await authorized.GetAsync("/api/enrollments");
        listResponse.EnsureSuccessStatusCode();
        var enrollments = (await ReadJsonAsync(listResponse)).EnumerateArray().ToList();
        Assert.Single(enrollments);
        Assert.Equal(courseId, enrollments[0].GetProperty("courseId").GetInt32());
        Assert.Equal("Modern Web Development", enrollments[0].GetProperty("courseName").GetString());

        var reEnrollResponse = await authorized.PostAsJsonAsync("/api/enrollments", new { courseId });
        Assert.Equal(HttpStatusCode.OK, reEnrollResponse.StatusCode);
        var body = await ReadJsonAsync(reEnrollResponse);
        Assert.Equal("Already enrolled", body.GetProperty("message").GetString());
    }

    [Fact]
    public async Task Enrollments_UnknownCourse_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("flow.enrollmissing@example.com");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId = 9999 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Posts_CreateAndList()
    {
        var registerResponse = await RegisterAsync(new
        {
            firstName = "Maria",
            lastName = "Clara",
            emailAddress = "flow.recruiter@example.com",
            password = "P@ssw0rd!",
            role = "Recruiter",
        });
        registerResponse.EnsureSuccessStatusCode();
        var registerBody = await ReadJsonAsync(registerResponse);
        var token = registerBody.GetProperty("token").GetString()!;
        var userId = registerBody.GetProperty("userId").GetInt32();
        var authorized = AuthorizedClient(token);

        int companyId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var company = new Company { Name = "Acme Corp" };
            db.Companies.Add(company);
            await db.SaveChangesAsync();
            companyId = company.CompanyId;

            db.Recruiters.Add(new Recruiter { CompanyId = companyId, UserId = userId });
            await db.SaveChangesAsync();
        }

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var recruiterId = (await db.Recruiters.SingleAsync(r => r.UserId == userId)).RecruiterId;

            var postResponse = await authorized.PostAsJsonAsync("/api/posts", new
            {
                recruiterId,
                companyId,
                title = "Senior Backend Developer",
                description = "Cebu City\nsalary: ₱120,000 - ₱180,000\nskills: Node.js, Python\nmatch: 85%",
            });
            Assert.Equal(HttpStatusCode.Created, postResponse.StatusCode);
        }

        var listResponse = await authorized.GetAsync("/api/posts");
        listResponse.EnsureSuccessStatusCode();
        var posts = (await ReadJsonAsync(listResponse)).EnumerateArray().ToList();
        Assert.Single(posts);
        Assert.Equal("Senior Backend Developer", posts[0].GetProperty("title").GetString());
        Assert.Equal("Acme Corp", posts[0].GetProperty("company").GetProperty("name").GetString());
    }

    [Fact]
    public async Task Posts_WithoutAuth_ReturnsUnauthorized()
    {
        var response = await Client.GetAsync("/api/posts");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private async Task<string> LoginTokenAsync(string email)
    {
        var response = await LoginAsync(new { emailAddress = email, password = "P@ssw0rd!" });
        response.EnsureSuccessStatusCode();
        var body = await ReadJsonAsync(response);
        return body.GetProperty("token").GetString()!;
    }

    private async Task SetAllRoleSkillsToRequiredAsync(int learnerId)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var roleSkills = await db.RoleSkills
            .Where(rs => rs.TargetRole == "Frontend Developer")
            .ToListAsync();

        var existingBySkill = (await db.LearnerSkills
            .Where(ls => ls.LearnerId == learnerId)
            .ToListAsync())
            .ToDictionary(ls => ls.SkillId);

        foreach (var rs in roleSkills)
        {
            if (existingBySkill.TryGetValue(rs.SkillId, out var ls))
            {
                ls.CurrentLevel = rs.RequiredLevel;
                ls.Verified = true;
            }
            else
            {
                db.LearnerSkills.Add(new LearnerSkill
                {
                    LearnerId = learnerId,
                    SkillId = rs.SkillId,
                    CurrentLevel = rs.RequiredLevel,
                    Verified = true,
                });
            }
        }

        await db.SaveChangesAsync();
    }
}
