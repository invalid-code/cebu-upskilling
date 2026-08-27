using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Security regression coverage for cross-user access (IDOR), mass assignment /
/// over-posting, stored content (XSS) and media upload hardening. Runs against
/// the real HTTP pipeline and a real PostgreSQL test database.
/// </summary>
public class SecurityRegressionApiTests : ProductionApiTestBase
{
    public SecurityRegressionApiTests(ProductionApiFactory factory) : base(factory) { }

    // ------------------------------------------------------------------ //
    // Object-level authorization (IDOR)
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Applications_AreScopedToTheCaller()
    {
        var learnerA = await RegisterLearnerAsync("secreg.apps.a@example.com");
        var learnerB = await RegisterLearnerAsync("secreg.apps.b@example.com");
        var (recruiterToken, companyId, recruiterId) =
            await RegisterRecruiterWithCompanyAsync("secreg.apps.recruiter@example.com");
        var postId = await CreatePostAsync(recruiterToken, companyId, recruiterId, "Security App Role");

        var applyA = await AuthorizedClient(learnerA).PostAsJsonAsync("/api/applications", new
        {
            postId,
            resumeUrl = "https://storage.example/resume.pdf",
        });
        Assert.Equal(HttpStatusCode.Created, applyA.StatusCode);

        var patchB = await AuthorizedClient(learnerB).PatchAsJsonAsync(
            $"/api/applications/{postId}", new { status = "withdrawn" });
        Assert.Equal(HttpStatusCode.NotFound, patchB.StatusCode);

        var listB = await ReadJsonAsync(await AuthorizedClient(learnerB).GetAsync("/api/applications"));
        Assert.Empty(listB.EnumerateArray().ToList());

        var listA = await ReadJsonAsync(await AuthorizedClient(learnerA).GetAsync("/api/applications"));
        Assert.Single(listA.EnumerateArray().ToList());
    }

    [Fact]
    public async Task AssessmentQuestionsAndSubmit_AreScopedToTheCaller()
    {
        var learnerA = await RegisterLearnerAsync("secreg.assess.a@example.com");
        var learnerB = await RegisterLearnerAsync("secreg.assess.b@example.com");

        var (learnerIdA, _) = await GetLearnerIdsAsync("secreg.assess.a@example.com");
        var assessmentId = await SeedAssessmentAsync(learnerIdA);

        var questionsA = await AuthorizedClient(learnerA).GetAsync($"/api/assessments/{assessmentId}/questions");
        Assert.Equal(HttpStatusCode.OK, questionsA.StatusCode);

        var questionsB = await AuthorizedClient(learnerB).GetAsync($"/api/assessments/{assessmentId}/questions");
        Assert.Equal(HttpStatusCode.NotFound, questionsB.StatusCode);

        var submitB = await AuthorizedClient(learnerB).PostAsJsonAsync(
            $"/api/assessments/{assessmentId}/submit",
            new { answers = new[] { new { questionId = 1, selectedOption = 0 } } });
        Assert.Equal(HttpStatusCode.BadRequest, submitB.StatusCode);
    }

    [Fact]
    public async Task CourseContent_IsScopedToEnrolledLearner()
    {
        var enrolled = await RegisterLearnerAsync("secreg.content.enrolled@example.com");
        var outsider = await RegisterLearnerAsync("secreg.content.outsider@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonsAsync();
        await AuthorizedClient(enrolled).PostAsJsonAsync("/api/enrollments", new { courseId });

        var contentEnrolled = await AuthorizedClient(enrolled).GetAsync($"/api/coursecontent/courses/{courseId}/content");
        Assert.Equal(HttpStatusCode.OK, contentEnrolled.StatusCode);

        var contentOutsider = await AuthorizedClient(outsider).GetAsync($"/api/coursecontent/courses/{courseId}/content");
        Assert.Equal(HttpStatusCode.NotFound, contentOutsider.StatusCode);

        var progressOutsider = await AuthorizedClient(outsider).PutAsJsonAsync(
            $"/api/coursecontent/lessons/{lessonId}/progress", new { lessonId, progressPercent = 100 });
        Assert.Equal(HttpStatusCode.NotFound, progressOutsider.StatusCode);
    }

    [Fact]
    public async Task Posts_UpdateAndDelete_AreScopedToOwningRecruiter()
    {
        var (recruiterAToken, companyA, recruiterA) =
            await RegisterRecruiterWithCompanyAsync("secreg.posts.a@example.com");
        var (recruiterBToken, companyB, recruiterB) =
            await RegisterRecruiterWithCompanyAsync("secreg.posts.b@example.com");
        var postId = await CreatePostAsync(recruiterAToken, companyA, recruiterA, "Owned Post");

        var updateB = await AuthorizedClient(recruiterBToken).PutAsJsonAsync($"/api/posts/{postId}", new
        {
            postId,
            recruiterId = recruiterB,
            companyId = companyB,
            title = "Hijacked by recruiter B",
            description = "Should not be allowed",
        });
        Assert.Equal(HttpStatusCode.NotFound, updateB.StatusCode);

        var deleteB = await AuthorizedClient(recruiterBToken).DeleteAsync($"/api/posts/{postId}");
        Assert.Equal(HttpStatusCode.NotFound, deleteB.StatusCode);

        var stillThere = await AuthorizedClient(recruiterAToken).GetAsync($"/api/posts/{postId}");
        Assert.Equal(HttpStatusCode.OK, stillThere.StatusCode);
        Assert.Equal("Owned Post", (await ReadJsonAsync(stillThere)).GetProperty("title").GetString());

        var deleteA = await AuthorizedClient(recruiterAToken).DeleteAsync($"/api/posts/{postId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteA.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Mass assignment / over-posting
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Register_IgnoresPrivilegeFieldsInBody()
    {
        var response = await RegisterAsync(new
        {
            firstName = "Jose",
            lastName = "Rizal",
            emailAddress = "secreg.overpost.register@example.com",
            password = "P@ssw0rd!",
            role = "Learner",
            resume = "Experienced software developer.",
            userId = 123456,
            emailConfirmed = true,
            isPremium = true,
            passwordHash = "attacker-supplied-hash",
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.NotEqual(123456, body.GetProperty("userId").GetInt32());
        Assert.Equal("Learner", body.GetProperty("role").GetString());

        await using var context = Factory.CreateDbContext();
        var user = await context.Users.SingleAsync(u => u.EmailAddress == "secreg.overpost.register@example.com");
        Assert.False(user.EmailConfirmed);
        Assert.StartsWith("$2", user.PasswordHash);
        Assert.NotEqual("attacker-supplied-hash", user.PasswordHash);
        var learner = await context.Learners.SingleAsync(l => l.UserId == user.UserId);
        Assert.False(learner.IsPremium);
    }

    [Fact]
    public async Task UpdateProfile_IgnoresPrivilegeFieldsInBody()
    {
        var token = await RegisterLearnerAsync("secreg.overpost.profile@example.com");

        var response = await AuthorizedClient(token).PatchAsJsonAsync("/api/auth/profile", new
        {
            targetRole = "Backend Developer",
            role = "Admin",
            emailConfirmed = true,
            userId = 1,
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Backend Developer", body.GetProperty("targetRole").GetString());
        Assert.Equal("Learner", body.GetProperty("role").GetString());

        await using var context = Factory.CreateDbContext();
        var user = await context.Users.SingleAsync(u => u.EmailAddress == "secreg.overpost.profile@example.com");
        Assert.False(user.EmailConfirmed);
        Assert.Equal("Learner", user.Role);
    }

    [Fact]
    public async Task Apply_IgnoresExtraStatusAndUserFields()
    {
        var token = await RegisterLearnerAsync("secreg.overpost.apply@example.com");
        var (recruiterToken, companyId, recruiterId) =
            await RegisterRecruiterWithCompanyAsync("secreg.overpost.apprecruiter@example.com");
        var postId = await CreatePostAsync(recruiterToken, companyId, recruiterId, "Overpost Role");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/applications", new
        {
            postId,
            status = "hired",
            userId = 1,
            resumeUrl = "https://storage.example/resume.pdf",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("applied", body.GetProperty("status").GetString());
    }

    [Fact]
    public async Task CreateCompany_IgnoresUnknownFields()
    {
        var (token, _, _) = await RegisterRecruiterWithCompanyAsync("secreg.overpost.company@example.com");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/companies", new
        {
            name = "Overpost Corp",
            secretField = "should-be-ignored",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.True(body.GetProperty("companyId").GetInt32() > 0);
        Assert.Equal("Overpost Corp", body.GetProperty("name").GetString());
    }

    // ------------------------------------------------------------------ //
    // Stored content (XSS surface)
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task PostWithHtml_IsStoredAndReturnedAsJsonData()
    {
        var (token, companyId, recruiterId) =
            await RegisterRecruiterWithCompanyAsync("secreg.xss.recruiter@example.com");
        const string payload = "<script>alert('xss')</script><img src=x onerror=alert(1)>";
        var authorized = AuthorizedClient(token);

        var createResponse = await authorized.PostAsJsonAsync("/api/posts", new
        {
            recruiterId,
            companyId,
            title = payload,
            description = $"Vulnerable description {payload}",
        });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await ReadJsonAsync(createResponse);
        var postId = created.GetProperty("postId").GetInt32();

        var getResponse = await authorized.GetAsync($"/api/posts/{postId}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        Assert.Contains("application/json", getResponse.Content.Headers.ContentType!.MediaType!);

        var raw = await getResponse.Content.ReadAsStringAsync();
        Assert.Contains("<script>alert('xss')</script>", raw);
        Assert.Contains("<img src=x onerror=alert(1)>", raw);

        var body = await ReadJsonAsync(getResponse);
        Assert.Equal(payload, body.GetProperty("title").GetString());
    }

    [Fact]
    public async Task CourseWithHtmlName_IsReturnedLiteral()
    {
        var token = await RegisterLearnerAsync("secreg.xss.course@example.com");
        var genreId = await CreateGenreAsync();
        const string payload = "<svg/onload=alert('xss')>";

        var createResponse = await AuthorizedClient(token).PostAsJsonAsync("/api/courses", new
        {
            genreId,
            name = payload,
            technicalLevel = 2,
            description = "XSS course",
            price = 1000,
            mode = "Online",
        });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var listResponse = await AuthorizedClient(token).GetAsync("/api/courses");
        var raw = await listResponse.Content.ReadAsStringAsync();
        Assert.Contains(payload, raw);
    }

    [Fact]
    public async Task CompanyQuestionWithHtml_IsReturnedLiteral()
    {
        var (token, _, _) = await RegisterRecruiterWithCompanyAsync("secreg.xss.question@example.com");
        const string payload = "<script>document.cookie</script>";

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/assessments/company/questions", new
        {
            skillId = 1,
            text = payload,
            optionA = "a",
            optionB = "b",
            optionC = "c",
            optionD = "d",
            correctOption = 0,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal(payload, body.GetProperty("text").GetString());
    }

    // ------------------------------------------------------------------ //
    // Media upload hardening
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Media_UploadNonVideoContentType_ReturnsBadRequest()
    {
        var token = await RegisterLearnerAsync("secreg.media.fakevideo@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonsAsync();
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("<html>not a video</html>"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/html");
        content.Add(fileContent, "file", "fake-video.html");

        var response = await AuthorizedClient(token).PostAsync($"/api/media/lessons/{lessonId}/video", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Only video files are allowed", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Media_UploadFilenameWithTraversal_IsSanitizedInStorageKey()
    {
        var token = await RegisterLearnerAsync("secreg.media.traversal@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonsAsync();
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x00, 0x01, 0x02 });
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("video/mp4");
        content.Add(fileContent, "file", "../../../etc/passwd.mp4");

        var response = await AuthorizedClient(token).PostAsync($"/api/media/lessons/{lessonId}/video", content);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJsonAsync(response);
        var path = body.GetProperty("pathFile").GetString();
        Assert.StartsWith($"https://fake-storage.example/course-content/{lessonId}/", path);
        Assert.DoesNotContain("..", path);
        Assert.DoesNotContain("etc/passwd", path);
    }

    [Fact]
    public async Task Media_UploadToLesson_WhenNotEnrolled_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("secreg.media.notenrolled@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonsAsync();

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x00, 0x01, 0x02 });
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("video/mp4");
        content.Add(fileContent, "file", "lesson.mp4");

        var response = await AuthorizedClient(token).PostAsync($"/api/media/lessons/{lessonId}/video", content);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Lesson not found or not enrolled", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Media_UploadByRecruiter_ReturnsNotFound()
    {
        var (token, _, _) = await RegisterRecruiterWithCompanyAsync("secreg.media.recruiter@example.com");
        var (_, lessonId) = await CreateCourseWithLessonsAsync();

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x00, 0x01, 0x02 });
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("video/mp4");
        content.Add(fileContent, "file", "lesson.mp4");

        var response = await AuthorizedClient(token).PostAsync($"/api/media/lessons/{lessonId}/video", content);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Media_UploadToLesson_WhenEnrolled_ReturnsCreated()
    {
        var token = await RegisterLearnerAsync("secreg.media.enrolled@example.com");
        var (courseId, lessonId) = await CreateCourseWithLessonsAsync();
        var enroll = await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });
        enroll.EnsureSuccessStatusCode();

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x00, 0x01, 0x02 });
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("video/mp4");
        content.Add(fileContent, "file", "lesson.mp4");

        var response = await AuthorizedClient(token).PostAsync($"/api/media/lessons/{lessonId}/video", content);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Helpers
    // ------------------------------------------------------------------ //

    private async Task<(int LearnerId, int UserId)> GetLearnerIdsAsync(string email)
    {
        await using var context = Factory.CreateDbContext();
        var user = await context.Users.SingleAsync(u => u.EmailAddress == email);
        var learner = await context.Learners.SingleAsync(l => l.UserId == user.UserId);
        return (learner.LearnerId, user.UserId);
    }

    private async Task<int> SeedAssessmentAsync(int learnerId)
    {
        await using var context = Factory.CreateDbContext();
        var assessment = new CebuUpskilling.Backend.Entities.LearnerAssessment
        {
            LearnerId = learnerId,
            SkillId = 1,
            ScoredLevel = 0,
            Verified = false,
            CompletedAt = DateTime.UtcNow,
        };
        context.LearnerAssessments.Add(assessment);
        await context.SaveChangesAsync();
        return assessment.LearnerAssessmentId;
    }

    private async Task<(string Token, int CompanyId, int RecruiterId)> RegisterRecruiterWithCompanyAsync(string email)
    {
        var response = await RegisterAsync(new
        {
            firstName = "Employer",
            lastName = "Corp",
            emailAddress = email,
            password = "P@ssw0rd!",
            role = "Recruiter",
        });
        response.EnsureSuccessStatusCode();
        var body = await ReadJsonAsync(response);
        var token = body.GetProperty("token").GetString()!;
        var userId = body.GetProperty("userId").GetInt32();

        await using var context = Factory.CreateDbContext();
        var company = new CebuUpskilling.Backend.Entities.Company { Name = $"Sec Corp {Guid.NewGuid():N}" };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var user = await context.Users.FindAsync(userId);
        user!.CompanyId = company.CompanyId;
        await context.SaveChangesAsync();

        return (token, company.CompanyId, userId);
    }

    private async Task<int> CreatePostAsync(string token, int companyId, int recruiterId, string title)
    {
        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/posts", new
        {
            title,
            description = "Cebu City\nskills: Node.js\nmatch: 80%",
        });
        response.EnsureSuccessStatusCode();
        var body = await ReadJsonAsync(response);
        return body.GetProperty("postId").GetInt32();
    }

    private async Task<int> CreateGenreAsync()
    {
        await using var context = Factory.CreateDbContext();
        var subDiscipline = new CebuUpskilling.Backend.Entities.SubDiscipline
        {
            DisciplineId = 1,
            Name = "Computer Science",
            Description = "CS",
        };
        context.SubDisciplines.Add(subDiscipline);
        await context.SaveChangesAsync();

        var genre = new CebuUpskilling.Backend.Entities.Genre
        {
            SubDisciplineId = subDiscipline.SubDisciplineId,
            Name = "Web Development",
            Description = "Web",
        };
        context.Genres.Add(genre);
        await context.SaveChangesAsync();
        return genre.GenreId;
    }

    private async Task<(int CourseId, int LessonId)> CreateCourseWithLessonsAsync()
    {
        var genreId = await CreateGenreAsync();
        await using var context = Factory.CreateDbContext();

        var course = new CebuUpskilling.Backend.Entities.Course
        {
            GenreId = genreId,
            Name = "Security Regression Course",
            TechnicalLevel = 2,
            Description = "Course",
            Price = 1000,
        };
        context.Courses.Add(course);
        await context.SaveChangesAsync();

        var module = new CebuUpskilling.Backend.Entities.CourseModule { CourseId = course.CourseId, Name = "Module 1", Order = 1 };
        context.CourseModules.Add(module);
        await context.SaveChangesAsync();

        var lesson = new CebuUpskilling.Backend.Entities.Lesson { ModuleId = module.ModuleId, CourseId = course.CourseId, Name = "Lesson 1", Description = "Lesson" };
        context.Lessons.Add(lesson);
        await context.SaveChangesAsync();

        return (course.CourseId, lesson.LessonId);
    }
}