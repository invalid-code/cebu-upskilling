using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CebuUpskilling.Backend.Tests.Integration;

public class JobPostingApiTests : ProductionApiTestBase
{
    public JobPostingApiTests(ProductionApiFactory factory) : base(factory) { }

    private async Task<(string token, int userId, int companyId)> RegisterRecruiterAsync(string email, string? companyName = null)
    {
        var response = await RegisterCompanyAsync(new
        {
            companyName = companyName ?? "Acme Corp",
            firstName = "Maria",
            lastName = "Clara",
            emailAddress = email,
            password = "P@ssw0rd!",
        });
        response.EnsureSuccessStatusCode();
        var body = await ReadJsonAsync(response);
        var token = body.GetProperty("token").GetString()!;
        var userId = body.GetProperty("userId").GetInt32();
        var companyId = body.GetProperty("companyId").GetInt32();

        return (token, userId, companyId);
    }

    private async Task<int> CreatePostAsync(string token, object body)
    {
        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/posts", body);
        response.EnsureSuccessStatusCode();
        var created = await ReadJsonAsync(response);
        return created.GetProperty("postId").GetInt32();
    }

    [Fact]
    public async Task Posts_CreateWithJobFields_ReturnsFullResponse()
    {
        var (token, _, _) = await RegisterRecruiterAsync("job.fields.recruiter@example.com");
        var authorized = AuthorizedClient(token);

        var response = await authorized.PostAsJsonAsync("/api/posts", new
        {
            title = "Senior Backend Engineer",
            description = "Build APIs",
            targetRole = "Backend Developer",
            location = "Cebu City",
            salaryRange = "₱120,000 - ₱180,000",
            jobType = "Full-time",
            experienceLevel = "Senior",
            requirements = "5+ years .NET",
            benefits = "HMO, 13th month",
            isRemote = true,
            expiresAt = "2026-12-31T00:00:00Z",
            isActive = true,
            companyLogoUrl = "https://example.com/logo.png",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Senior Backend Engineer", body.GetProperty("title").GetString());
        Assert.Equal("Acme Corp", body.GetProperty("companyName").GetString());
        Assert.Equal("Cebu City", body.GetProperty("location").GetString());
        Assert.Equal("₱120,000 - ₱180,000", body.GetProperty("salaryRange").GetString());
        Assert.Equal("Full-time", body.GetProperty("jobType").GetString());
        Assert.Equal("Senior", body.GetProperty("experienceLevel").GetString());
        Assert.True(body.GetProperty("isRemote").GetBoolean());
        Assert.True(body.GetProperty("isActive").GetBoolean());
        Assert.Equal("https://example.com/logo.png", body.GetProperty("companyLogoUrl").GetString());
    }

    [Fact]
    public async Task Posts_SearchFiltersAndPaginates()
    {
        var (token, _, _) = await RegisterRecruiterAsync("job.search.recruiter@example.com");
        var authorized = AuthorizedClient(token);

        await CreatePostAsync(token, new { title = "Frontend Developer", jobType = "Full-time", location = "Cebu City" });
        await CreatePostAsync(token, new { title = "UI Designer", jobType = "Part-time", location = "Mandaue" });
        await CreatePostAsync(token, new { title = "Backend Developer", jobType = "Full-time", location = "Remote", isRemote = true });

        var bySearch = await authorized.GetAsync("/api/posts?search=developer");
        bySearch.EnsureSuccessStatusCode();
        var searchBody = await ReadJsonAsync(bySearch);
        var searchItems = searchBody.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, searchItems.Count);
        Assert.Equal(2, searchBody.GetProperty("total").GetInt32());

        var byType = await authorized.GetAsync("/api/posts?jobType=Full-time");
        byType.EnsureSuccessStatusCode();
        var typeItems = (await ReadJsonAsync(byType)).GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, typeItems.Count);

        var byRemote = await authorized.GetAsync("/api/posts?isRemote=true");
        byRemote.EnsureSuccessStatusCode();
        var remoteItems = (await ReadJsonAsync(byRemote)).GetProperty("items").EnumerateArray().ToList();
        Assert.Single(remoteItems);
        Assert.Equal("Backend Developer", remoteItems[0].GetProperty("title").GetString());

        var byLocation = await authorized.GetAsync("/api/posts?location=cebu");
        byLocation.EnsureSuccessStatusCode();
        var locationItems = (await ReadJsonAsync(byLocation)).GetProperty("items").EnumerateArray().ToList();
        Assert.Single(locationItems);
        Assert.Equal("Frontend Developer", locationItems[0].GetProperty("title").GetString());

        var paged = await authorized.GetAsync("/api/posts?page=1&pageSize=2");
        paged.EnsureSuccessStatusCode();
        var pagedBody = await ReadJsonAsync(paged);
        Assert.Equal(2, pagedBody.GetProperty("items").EnumerateArray().Count());
        Assert.Equal(3, pagedBody.GetProperty("total").GetInt32());
        Assert.Equal(1, pagedBody.GetProperty("page").GetInt32());
        Assert.Equal(2, pagedBody.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task Employer_ListAndUpdateApplications_WithHiredStatus()
    {
        var (recruiterToken, _, companyId) = await RegisterRecruiterAsync("job.employer.recruiter@example.com");
        var postId = await CreatePostAsync(recruiterToken, new { title = "QA Engineer" });

        var learnerToken = await RegisterLearnerAsync("job.employer.learner@example.com");
        var learner = AuthorizedClient(learnerToken);

        var applyResponse = await learner.PostAsJsonAsync("/api/applications", new { postId });
        Assert.Equal(HttpStatusCode.Created, applyResponse.StatusCode);
        var applied = await ReadJsonAsync(applyResponse);

        var employer = AuthorizedClient(recruiterToken);
        var listResponse = await employer.GetAsync("/api/applications/employer");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var list = (await ReadJsonAsync(listResponse)).EnumerateArray().ToList();
        Assert.Single(list);
        Assert.Equal(postId, list[0].GetProperty("postId").GetInt32());
        Assert.Equal("Jose Rizal", list[0].GetProperty("learnerName").GetString());
        Assert.Equal("job.employer.learner@example.com", list[0].GetProperty("learnerEmail").GetString());
        Assert.Equal("applied", list[0].GetProperty("status").GetString());

        var applicationId = list[0].GetProperty("applicationId").GetInt32();

        var hireResponse = await employer.PatchAsJsonAsync(
            $"/api/applications/employer/{applicationId}", new { status = "hired" });
        Assert.Equal(HttpStatusCode.OK, hireResponse.StatusCode);
        Assert.Equal("hired", (await ReadJsonAsync(hireResponse)).GetProperty("status").GetString());

        var listAfter = (await ReadJsonAsync(await employer.GetAsync("/api/applications/employer"))).EnumerateArray().ToList();
        Assert.Equal("hired", listAfter[0].GetProperty("status").GetString());

        var learnerList = (await ReadJsonAsync(await learner.GetAsync("/api/applications"))).EnumerateArray().ToList();
        Assert.Equal("hired", learnerList[0].GetProperty("status").GetString());
    }

    [Fact]
    public async Task Employer_ViewsApplicantProfile_WithDocumentsAndSkills()
    {
        var (recruiterToken, _, companyId) = await RegisterRecruiterAsync("job.profile.recruiter@example.com");
        var postId = await CreatePostAsync(recruiterToken, new { title = "Platform Engineer" });

        var learnerToken = await RegisterLearnerAsync("job.profile.learner@example.com");
        var learner = AuthorizedClient(learnerToken);

        var applyResponse = await learner.PostAsJsonAsync("/api/applications", new
        {
            postId,
            resumeUrl = "/uploads/documents/resume.pdf",
            coverLetterUrl = "/uploads/documents/cover.pdf",
        });
        Assert.Equal(HttpStatusCode.Created, applyResponse.StatusCode);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var applicationId = (await db.Applications.SingleAsync()).ApplicationId;

            var employer = AuthorizedClient(recruiterToken);
            var response = await employer.GetAsync($"/api/applications/employer/{applicationId}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var body = await ReadJsonAsync(response);
            Assert.Equal("Jose Rizal", body.GetProperty("learnerName").GetString());
            Assert.Equal("job.profile.learner@example.com", body.GetProperty("learnerEmail").GetString());
            Assert.Equal("/uploads/documents/resume.pdf", body.GetProperty("resumeUrl").GetString());
            Assert.Equal("/uploads/documents/cover.pdf", body.GetProperty("coverLetterUrl").GetString());
            Assert.Equal("Platform Engineer", body.GetProperty("postTitle").GetString());
            Assert.Equal("applied", body.GetProperty("status").GetString());

            var (otherToken, _, _) = await RegisterRecruiterAsync("job.profile.other@example.com", $"Rival Corp {Guid.NewGuid():N}");
            Assert.Equal(HttpStatusCode.Forbidden,
                (await AuthorizedClient(otherToken).GetAsync($"/api/applications/employer/{applicationId}")).StatusCode);
        }
    }

    [Fact]
    public async Task Employer_CannotUpdateOtherCompanysApplication()
    {
        var (recruiterToken, _, _) = await RegisterRecruiterAsync("job.other.recruiter@example.com");
        var postId = await CreatePostAsync(recruiterToken, new { title = "Data Analyst" });

        var learnerToken = await RegisterLearnerAsync("job.other.learner@example.com");
        await AuthorizedClient(learnerToken).PostAsJsonAsync("/api/applications", new { postId });

        var (otherToken, _, _) = await RegisterRecruiterAsync("job.other.recruiter2@example.com", $"Rival Corp {Guid.NewGuid():N}");
        var other = AuthorizedClient(otherToken);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var applicationId = (await db.Applications.SingleAsync()).ApplicationId;
            var response = await other.PatchAsJsonAsync(
                $"/api/applications/employer/{applicationId}", new { status = "hired" });
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    [Fact]
    public async Task Employer_InvalidStatus_ReturnsBadRequest()
    {
        var (recruiterToken, _, _) = await RegisterRecruiterAsync("job.invalid.recruiter@example.com");
        var postId = await CreatePostAsync(recruiterToken, new { title = "Support Engineer" });

        var learnerToken = await RegisterLearnerAsync("job.invalid.learner@example.com");
        await AuthorizedClient(learnerToken).PostAsJsonAsync("/api/applications", new { postId });

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var applicationId = (await db.Applications.SingleAsync()).ApplicationId;
            var response = await AuthorizedClient(recruiterToken).PatchAsJsonAsync(
                $"/api/applications/employer/{applicationId}", new { status = "nonsense" });
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }

    [Fact]
    public async Task Media_UploadDocument_ReturnsUrl()
    {
        var token = await RegisterLearnerAsync("job.document.learner@example.com");

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x25, 0x50, 0x44, 0x46 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "resume.pdf");

        var response = await AuthorizedClient(token).PostAsync("/api/media/documents", content);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.StartsWith("https://fake-storage.example/", body.GetProperty("url").GetString());
        Assert.Equal("resume.pdf", body.GetProperty("fileName").GetString());
    }

    [Fact]
    public async Task Media_UploadUnsupportedDocument_ReturnsBadRequest()
    {
        var token = await RegisterLearnerAsync("job.document.bad@example.com");

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x00, 0x01 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/x-msdownload");
        content.Add(fileContent, "file", "virus.exe");

        var response = await AuthorizedClient(token).PostAsync("/api/media/documents", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Applications_ApplyWithResumeAndCoverLetter_StoresUrls()
    {
        var (recruiterToken, _, _) = await RegisterRecruiterAsync("job.resume.recruiter@example.com");
        var postId = await CreatePostAsync(recruiterToken, new { title = "Mobile Developer" });

        var learnerToken = await RegisterLearnerAsync("job.resume.learner@example.com");
        var response = await AuthorizedClient(learnerToken).PostAsJsonAsync("/api/applications", new
        {
            postId,
            resumeUrl = "https://storage.example/resume.pdf",
            coverLetterUrl = "https://storage.example/cover.pdf",
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("https://storage.example/resume.pdf", body.GetProperty("resumeUrl").GetString());
        Assert.Equal("https://storage.example/cover.pdf", body.GetProperty("coverLetterUrl").GetString());
    }

    [Fact]
    public async Task Posts_LearnerCannotCreateOrModify()
    {
        var token = await RegisterLearnerAsync("job.forbidden.learner@example.com");
        var authorized = AuthorizedClient(token);

        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.PostAsJsonAsync("/api/posts", new
        {
            title = "Nope",
        })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.PutAsJsonAsync("/api/posts/1", new
        {
            title = "Nope",
        })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.DeleteAsync("/api/posts/1")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await authorized.GetAsync("/api/applications/employer")).StatusCode);
    }
}