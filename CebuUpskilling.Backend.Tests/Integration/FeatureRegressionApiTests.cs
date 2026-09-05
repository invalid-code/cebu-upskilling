using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Endpoint-level regression coverage for the learner features that the unit
/// suites don't reach: stats, courses page, course content, the full assessment
/// flow, applications, base entity CRUD, and media upload (against a fake
/// object-storage backend). Runs against the real HTTP pipeline and an isolated
/// in-memory test database.
/// </summary>
public class FeatureRegressionApiTests : ProductionApiTestBase
{
    public FeatureRegressionApiTests(ProductionApiFactory factory) : base(factory) { }

    // ------------------------------------------------------------------ //
    // Stats
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Stats_Week_ForFreshLearner_ReturnsZeros()
    {
        var token = await RegisterLearnerAsync("regr.stats.zeros@example.com");

        var response = await AuthorizedClient(token).GetAsync("/api/stats/week");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal(0, body.GetProperty("learningTimeHours").GetDouble());
        Assert.Equal(0, body.GetProperty("coursesActive").GetInt32());
        Assert.Equal(0, body.GetProperty("jobsWorthApplying").GetInt32());
    }

    [Fact]
    public async Task Stats_Week_WithEnrollmentAndPost_ReflectsCounts()
    {
        var token = await RegisterLearnerAsync("regr.stats.counts@example.com");
        var courseId = await CreateCourseAsync(token);
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        var (recruiterToken, _, companyId) =
            await RegisterRecruiterWithCompanyAsync("regr.stats.recruiter@example.com");
        await CreatePostAsync(recruiterToken, companyId, "Open Role");

        var response = await AuthorizedClient(token).GetAsync("/api/stats/week");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal(1, body.GetProperty("coursesActive").GetInt32());
        Assert.Equal(1, body.GetProperty("jobsWorthApplying").GetInt32());
    }

    // ------------------------------------------------------------------ //
    // Courses page + course detail
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task CoursesPage_WithTargetRole_ListsRecommendedCourses()
    {
        var token = await RegisterLearnerAsync("regr.courses.recommended@example.com", "Frontend Developer");
        var courseId = await CreateCourseAsync(token, "JavaScript Essentials");

        var response = await AuthorizedClient(token).GetAsync("/api/coursespage");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);

        Assert.Empty(body.GetProperty("enrolledCourses").EnumerateArray().ToList());
        Assert.Equal(0, body.GetProperty("coursesInProgress").GetInt32());
        Assert.Equal(0, body.GetProperty("certificatesEarned").GetInt32());
        Assert.Equal(0, body.GetProperty("dayStreak").GetInt32());

        var recommended = body.GetProperty("recommendedCourses").EnumerateArray().ToList();
        var course = recommended.Single(c => c.GetProperty("courseId").GetInt32() == courseId);
        Assert.Equal("JavaScript Essentials", course.GetProperty("name").GetString());
        Assert.True(course.GetProperty("isRecommended").GetBoolean());
        Assert.Equal("Language", course.GetProperty("skillCategory").GetString());
        Assert.Equal("Frontend Developer", body.GetProperty("targetRole").GetString());
        Assert.False(course.GetProperty("isEnrolled").GetBoolean());
    }

    [Fact]
    public async Task CoursesPage_EnrolledCourse_MovesFromRecommendedToEnrolled()
    {
        var token = await RegisterLearnerAsync("regr.courses.enrolled@example.com", "Frontend Developer");
        var courseId = await CreateCourseAsync(token);
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        var response = await AuthorizedClient(token).GetAsync("/api/coursespage");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);

        var enrolled = body.GetProperty("enrolledCourses").EnumerateArray().ToList();
        Assert.Single(enrolled);
        Assert.Equal(courseId, enrolled[0].GetProperty("courseId").GetInt32());
        Assert.Equal("Modern Web Development", enrolled[0].GetProperty("courseName").GetString());
        Assert.Equal(1, body.GetProperty("coursesInProgress").GetInt32());

        var recommended = body.GetProperty("recommendedCourses").EnumerateArray().ToList();
        Assert.DoesNotContain(recommended, c => c.GetProperty("courseId").GetInt32() == courseId);
    }

    [Fact]
    public async Task CoursesPage_RecruiterWithoutLearnerProfile_ReturnsBadRequest()
    {
        var (token, _, _) = await RegisterRecruiterWithCompanyAsync("regr.courses.recruiter@example.com");

        var response = await AuthorizedClient(token).GetAsync("/api/coursespage");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("No learner profile found", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task CourseDetail_ExistingCourse_ReturnsModules()
    {
        var token = await RegisterLearnerAsync("regr.detail.existing@example.com");
        var (courseId, lessonIds) = await CreateCourseWithLessonsAsync();

        var response = await AuthorizedClient(token).GetAsync($"/api/courses/{courseId}/detail");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal(courseId, body.GetProperty("courseId").GetInt32());
        Assert.Equal("Modern Web Development", body.GetProperty("name").GetString());
        Assert.Equal(2, body.GetProperty("totalModules").GetInt32());
        Assert.False(body.GetProperty("isEnrolled").GetBoolean());

        var modules = body.GetProperty("modules").EnumerateArray().ToList();
        Assert.Equal(2, modules.Count);
        Assert.Equal(lessonIds[0], modules[0].GetProperty("lessons")[0].GetProperty("lessonId").GetInt32());
    }

    [Fact]
    public async Task CourseDetail_EnrolledCourse_ReportsIsEnrolled()
    {
        var token = await RegisterLearnerAsync("regr.detail.enrolled@example.com");
        var courseId = await CreateCourseAsync(token);
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        var response = await AuthorizedClient(token).GetAsync($"/api/courses/{courseId}/detail");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.True(body.GetProperty("isEnrolled").GetBoolean());
        Assert.Equal(0, body.GetProperty("progressPercent").GetInt32());
    }

    [Fact]
    public async Task CourseDetail_UnknownCourse_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("regr.detail.missing@example.com");

        var response = await AuthorizedClient(token).GetAsync("/api/courses/999999/detail");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Course content
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task CourseContent_WithoutEnrollment_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("regr.content.notenrolled@example.com");
        var (courseId, _) = await CreateCourseWithLessonsAsync();

        var response = await AuthorizedClient(token).GetAsync($"/api/coursecontent/courses/{courseId}/content");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CourseContent_FullLearnerFlow_ReturnsContentAndTracksProgress()
    {
        var token = await RegisterLearnerAsync("regr.content.flow@example.com");
        var (courseId, lessonIds) = await CreateCourseWithLessonsAsync();
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        var contentResponse = await AuthorizedClient(token).GetAsync($"/api/coursecontent/courses/{courseId}/content");
        Assert.Equal(HttpStatusCode.OK, contentResponse.StatusCode);
        var content = await ReadJsonAsync(contentResponse);

        Assert.Equal(courseId, content.GetProperty("courseId").GetInt32());
        Assert.Equal("Modern Web Development", content.GetProperty("courseName").GetString());
        Assert.Equal(2, content.GetProperty("totalLessons").GetInt32());
        Assert.Equal(0, content.GetProperty("completedLessons").GetInt32());
        Assert.Equal(0, content.GetProperty("progressPercent").GetInt32());
        Assert.Equal(2, content.GetProperty("modules").EnumerateArray().ToList().Count);
        Assert.Equal(lessonIds[0], content.GetProperty("currentLesson").GetProperty("lessonId").GetInt32());

        var lessonResponse = await AuthorizedClient(token).GetAsync($"/api/coursecontent/lessons/{lessonIds[0]}");
        Assert.Equal(HttpStatusCode.OK, lessonResponse.StatusCode);
        var lesson = await ReadJsonAsync(lessonResponse);
        Assert.Equal("HTML Fundamentals", lesson.GetProperty("name").GetString());
        var blocks = lesson.GetProperty("contentBlocks").EnumerateArray().ToList();
        Assert.Single(blocks);
        Assert.Equal("text", blocks[0].GetProperty("blockType").GetString());

        var progressResponse = await AuthorizedClient(token).PutAsJsonAsync(
            $"/api/coursecontent/lessons/{lessonIds[0]}/progress",
            new { lessonId = lessonIds[0], progressPercent = 100 });
        Assert.Equal(HttpStatusCode.OK, progressResponse.StatusCode);
        var progress = await ReadJsonAsync(progressResponse);
        Assert.True(progress.GetProperty("isCompleted").GetBoolean());
        Assert.Equal(100, progress.GetProperty("progressPercent").GetInt32());

        var afterResponse = await AuthorizedClient(token).GetAsync($"/api/coursecontent/courses/{courseId}/content");
        var after = await ReadJsonAsync(afterResponse);
        Assert.Equal(50, after.GetProperty("progressPercent").GetInt32());
        Assert.Equal(1, after.GetProperty("completedLessons").GetInt32());
    }

    [Fact]
    public async Task CourseContent_ProgressWithoutEnrollment_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("regr.content.progress@example.com");
        var (_, lessonIds) = await CreateCourseWithLessonsAsync();

        var response = await AuthorizedClient(token).PutAsJsonAsync(
            $"/api/coursecontent/lessons/{lessonIds[0]}/progress",
            new { lessonId = lessonIds[0], progressPercent = 100 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Assessments
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Assessments_Available_WithTargetRole_ListsRoleAssessments()
    {
        var token = await RegisterLearnerAsync("regr.assess.available@example.com", "Frontend Developer");

        var response = await AuthorizedClient(token).GetAsync("/api/assessments/available");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);

        var assessments = body.GetProperty("assessments").EnumerateArray().ToList();
        Assert.Equal(7, assessments.Count);
        Assert.Equal(0, body.GetProperty("verifiedSkillsCount").GetInt32());
        Assert.Equal(7, body.GetProperty("recommendedCount").GetInt32());

        var top = assessments[0];
        Assert.Equal("HTML", top.GetProperty("skillName").GetString());
        Assert.Equal(4, top.GetProperty("gap").GetInt32());
        Assert.Equal("AI-generated", top.GetProperty("sourceLabel").GetString());
        Assert.True(top.GetProperty("proctored").GetBoolean());
    }

    [Fact]
    public async Task Assessments_Start_UnknownSkill_ReturnsBadRequest()
    {
        var token = await RegisterLearnerAsync("regr.assess.badskill@example.com");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/assessments/start", new { skillId = 999 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Assessments_StartQuestionsSubmit_FullFlowScoresExpert()
    {
        var token = await RegisterLearnerAsync("regr.assess.flow@example.com", "Frontend Developer");

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            for (var i = 0; i < 5; i++)
            {
                db.AssessmentQuestions.Add(new AssessmentQuestion
                {
                    SkillId = 1,
                    Text = $"JavaScript question {i}",
                    OptionA = "Correct answer",
                    OptionB = "Wrong option 1",
                    OptionC = "Wrong option 2",
                    OptionD = "Wrong option 3",
                    CorrectOption = 0,
                    Source = AssessmentSource.AI,
                });
            }
            await db.SaveChangesAsync();
        }

        var startResponse = await AuthorizedClient(token).PostAsJsonAsync("/api/assessments/start", new { skillId = 1 });
        Assert.Equal(HttpStatusCode.OK, startResponse.StatusCode);
        var started = await ReadJsonAsync(startResponse);
        var assessmentId = started.GetProperty("assessmentId").GetInt32();
        Assert.Equal("JavaScript", started.GetProperty("skillName").GetString());

        var questionsResponse = await AuthorizedClient(token).GetAsync($"/api/assessments/{assessmentId}/questions");
        Assert.Equal(HttpStatusCode.OK, questionsResponse.StatusCode);
        var questions = await ReadJsonAsync(questionsResponse);
        Assert.Equal("JavaScript", questions.GetProperty("skillName").GetString());
        Assert.Equal("AI-generated", questions.GetProperty("source").GetString());
        var questionList = questions.GetProperty("questions").EnumerateArray().ToList();
        Assert.Equal(5, questionList.Count);
        Assert.Equal(4, questionList[0].GetProperty("options").EnumerateArray().ToList().Count);

        var answers = questionList
            .Select(q => new { questionId = q.GetProperty("questionId").GetInt32(), selectedOption = 0 })
            .ToList();

        var submitResponse = await AuthorizedClient(token).PostAsJsonAsync(
            $"/api/assessments/{assessmentId}/submit", new { answers });
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var submitted = await ReadJsonAsync(submitResponse);

        Assert.True(submitted.GetProperty("verified").GetBoolean());
        Assert.Equal(5, submitted.GetProperty("correctAnswers").GetInt32());
        Assert.Equal(5, submitted.GetProperty("totalQuestions").GetInt32());
        Assert.Equal(100, submitted.GetProperty("scorePercent").GetInt32());
        Assert.Equal(5, submitted.GetProperty("scoredLevel").GetInt32());
        Assert.Equal("Expert", submitted.GetProperty("levelLabel").GetString());
    }

    [Fact]
    public async Task Assessments_CompanyQuestion_RecruiterCreates()
    {
        var (token, _, companyId) = await RegisterRecruiterWithCompanyAsync("regr.assess.recruiter@example.com");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/assessments/company/questions", new
        {
            skillId = 1,
            text = "What does the 'const' keyword do in JavaScript?",
            optionA = "Declares a block-scoped constant binding",
            optionB = "Declares a function",
            optionC = "Imports a module",
            optionD = "Defines a class",
            correctOption = 0,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.True(body.GetProperty("questionId").GetInt32() > 0);
        Assert.Equal("Company", body.GetProperty("source").GetString());
        Assert.Equal("Acme Corp", body.GetProperty("companyName").GetString());

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var question = await db.AssessmentQuestions
                .SingleAsync(q => q.AssessmentQuestionId == body.GetProperty("questionId").GetInt32());
            Assert.Equal(AssessmentSource.Company, question.Source);
            Assert.Equal(companyId, question.CompanyId);
        }
    }

    [Fact]
    public async Task Assessments_CompanyQuestion_LearnerIsRejected()
    {
        var token = await RegisterLearnerAsync("regr.assess.learner@example.com");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/assessments/company/questions", new
        {
            skillId = 1,
            text = "Question",
            optionA = "a",
            optionB = "b",
            optionC = "c",
            optionD = "d",
            correctOption = 0,
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Applications
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Applications_ApplyListAndUpdateStatus()
    {
        var learnerToken = await RegisterLearnerAsync("regr.apps.learner@example.com");
        var (recruiterToken, _, companyId) =
            await RegisterRecruiterWithCompanyAsync("regr.apps.recruiter@example.com");
        var postId = await CreatePostAsync(recruiterToken, companyId, "Senior Developer");
        var authorized = AuthorizedClient(learnerToken);

        var emptyResponse = await authorized.GetAsync("/api/applications");
        Assert.Equal(HttpStatusCode.OK, emptyResponse.StatusCode);
        Assert.Empty((await ReadJsonAsync(emptyResponse)).EnumerateArray().ToList());

        var applyResponse = await authorized.PostAsJsonAsync("/api/applications", new
        {
            postId,
            resumeUrl = "https://storage.example/resume.pdf",
        });
        Assert.Equal(HttpStatusCode.Created, applyResponse.StatusCode);
        var created = await ReadJsonAsync(applyResponse);
        Assert.Equal(postId, created.GetProperty("postId").GetInt32());
        Assert.Equal("Senior Developer", created.GetProperty("title").GetString());
        Assert.Equal("Acme Corp", created.GetProperty("company").GetString());
        Assert.Equal("applied", created.GetProperty("status").GetString());

        var duplicateResponse = await authorized.PostAsJsonAsync("/api/applications", new
        {
            postId,
            resumeUrl = "https://storage.example/resume.pdf",
        });
        Assert.Equal(HttpStatusCode.OK, duplicateResponse.StatusCode);

        var patchResponse = await authorized.PatchAsJsonAsync(
            $"/api/applications/{postId}", new { status = "saved" });
        Assert.Equal(HttpStatusCode.OK, patchResponse.StatusCode);
        var patched = await ReadJsonAsync(patchResponse);
        Assert.Equal("updated", patched.GetProperty("message").GetString());

        var listResponse = await authorized.GetAsync("/api/applications");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var list = (await ReadJsonAsync(listResponse)).EnumerateArray().ToList();
        Assert.Single(list);
        Assert.Equal("saved", list[0].GetProperty("status").GetString());
        Assert.False(list[0].GetProperty("savedAt").ValueKind == JsonValueKind.Null);
    }

    [Fact]
    public async Task Applications_UnknownPost_ReturnsNotFound()
    {
        var token = await RegisterLearnerAsync("regr.apps.missing@example.com");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/applications", new
        {
            postId = 9999,
            resumeUrl = "https://storage.example/resume.pdf",
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Applications_WithoutResume_AppendsStoredProfileResume()
    {
        var token = await RegisterLearnerAsync("regr.apps.noresume@example.com");
        var (recruiterToken, _, companyId) =
            await RegisterRecruiterWithCompanyAsync("regr.apps.noresume.recruiter@example.com");
        var postId = await CreatePostAsync(recruiterToken, companyId, "Resume Required Role");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/applications", new { postId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("resumeUrl").GetString()));
    }

    [Fact]
    public async Task Applications_WithoutAnyResume_ReturnsBadRequest()
    {
        const string email = "regr.apps.nostoredresume@example.com";
        var token = await RegisterLearnerAsync(email);
        var (recruiterToken, _, companyId) =
            await RegisterRecruiterWithCompanyAsync("regr.apps.nostoredresume.recruiter@example.com");
        var postId = await CreatePostAsync(recruiterToken, companyId, "Resume Required Role");

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = await db.Users.SingleAsync(u => u.EmailAddress == email);
            user.ResumeUrl = null;
            await db.SaveChangesAsync();
        }

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/applications", new { postId });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Contains("resume", body.GetProperty("error").GetString(), StringComparison.OrdinalIgnoreCase);
    }

    // ------------------------------------------------------------------ //
    // Base entity CRUD (Posts / Courses)
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Posts_BaseCrud_GetByIdUpdateDelete()
    {
        var (token, _, companyId) =
            await RegisterRecruiterWithCompanyAsync("regr.posts.recruiter@example.com");
        var authorized = AuthorizedClient(token);
        var postId = await CreatePostAsync(token, companyId, "Backend Engineer");
        var location = $"/api/posts/{postId}";

        var getResponse = await authorized.GetAsync(location);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        Assert.Equal("Backend Engineer", (await ReadJsonAsync(getResponse)).GetProperty("title").GetString());

        var updateResponse = await authorized.PutAsJsonAsync(location, new
        {
            postId,
            title = "Senior Backend Engineer",
            description = "Updated description",
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        Assert.Equal("Senior Backend Engineer", (await ReadJsonAsync(updateResponse)).GetProperty("title").GetString());

        var deleteResponse = await authorized.DeleteAsync(location);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await authorized.GetAsync(location);
        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);
    }

    [Fact]
    public async Task Courses_BaseCrud_CreateGetUpdateDelete()
    {
        var token = await RegisterLearnerAsync("regr.courses.crud@example.com");
        var authorized = AuthorizedClient(token);
        var genreId = await CreateGenreAsync();

        var createResponse = await authorized.PostAsJsonAsync("/api/courses", new
        {
            genreId,
            name = "Regression Course",
            technicalLevel = 2,
            description = "Seeded by regression tests",
            price = 2500,
            mode = "Online",
        });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await ReadJsonAsync(createResponse);
        var courseId = created.GetProperty("courseId").GetInt32();
        var location = $"/api/courses/{courseId}";

        var listResponse = await authorized.GetAsync("/api/courses");
        var list = (await ReadJsonAsync(listResponse)).EnumerateArray().ToList();
        Assert.Contains(list, c => c.GetProperty("courseId").GetInt32() == courseId);

        var getResponse = await authorized.GetAsync(location);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        Assert.Equal("Regression Course", (await ReadJsonAsync(getResponse)).GetProperty("name").GetString());

        var updateResponse = await authorized.PutAsJsonAsync(location, new
        {
            courseId,
            genreId,
            name = "Updated Regression Course",
            technicalLevel = 3,
            description = "Updated",
            price = 3000,
            mode = "Hybrid",
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        Assert.Equal("Updated Regression Course", (await ReadJsonAsync(updateResponse)).GetProperty("name").GetString());

        var deleteResponse = await authorized.DeleteAsync(location);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await authorized.GetAsync(location);
        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Media upload
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Media_UploadLessonVideo_ReturnsStoredMedia()
    {
        var token = await RegisterLearnerAsync("regr.media.upload@example.com");
        var (courseId, lessonIds) = await CreateCourseWithLessonsAsync();
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32 });
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("video/mp4");
        content.Add(fileContent, "file", "lesson.mp4");

        var response = await AuthorizedClient(token).PostAsync($"/api/media/lessons/{lessonIds[0]}/video", content);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.True(body.GetProperty("mediaId").GetInt32() > 0);
        Assert.StartsWith("https://fake-storage.example/", body.GetProperty("pathFile").GetString());
        Assert.Equal("video/mp4", body.GetProperty("type").GetString());
    }

    [Fact]
    public async Task Media_UploadEmptyFile_ReturnsBadRequest()
    {
        var token = await RegisterLearnerAsync("regr.media.empty@example.com");
        var (courseId, lessonIds) = await CreateCourseWithLessonsAsync();
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Array.Empty<byte>());
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("video/mp4");
        content.Add(fileContent, "file", "empty.mp4");

        var response = await AuthorizedClient(token).PostAsync($"/api/media/lessons/{lessonIds[0]}/video", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("A video file must be provided", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Media_UploadLessonDocument_ReturnsStoredMedia()
    {
        var token = await RegisterLearnerAsync("regr.media.doc@example.com");
        var (courseId, lessonIds) = await CreateCourseWithLessonsAsync();
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("%PDF-1.4 fake pdf"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "handout.pdf");

        var response = await AuthorizedClient(token).PostAsync($"/api/media/lessons/{lessonIds[0]}/documents", content);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.True(body.GetProperty("mediaId").GetInt32() > 0);
        Assert.StartsWith("https://fake-storage.example/", body.GetProperty("pathFile").GetString());
        Assert.Equal("application/pdf", body.GetProperty("type").GetString());
    }

    [Fact]
    public async Task Media_UploadLessonDocument_UnsupportedType_ReturnsBadRequest()
    {
        var token = await RegisterLearnerAsync("regr.media.docexe@example.com");
        var (courseId, lessonIds) = await CreateCourseWithLessonsAsync();
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x4D, 0x5A });
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        content.Add(fileContent, "file", "evil.exe");

        var response = await AuthorizedClient(token).PostAsync($"/api/media/lessons/{lessonIds[0]}/documents", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Media_UploadLessonDocument_FakeContent_ReturnsBadRequest()
    {
        var token = await RegisterLearnerAsync("regr.media.docfake@example.com");
        var (courseId, lessonIds) = await CreateCourseWithLessonsAsync();
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("definitely not a pdf"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "handout.pdf");

        var response = await AuthorizedClient(token).PostAsync($"/api/media/lessons/{lessonIds[0]}/documents", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Media_UploadLessonVideo_SpoofedContent_ReturnsBadRequest()
    {
        var token = await RegisterLearnerAsync("regr.media.vidspoof@example.com");
        var (courseId, lessonIds) = await CreateCourseWithLessonsAsync();
        await AuthorizedClient(token).PostAsJsonAsync("/api/enrollments", new { courseId });

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("not a video at all"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("video/mp4");
        content.Add(fileContent, "file", "evil.mp4");

        var response = await AuthorizedClient(token).PostAsync($"/api/media/lessons/{lessonIds[0]}/video", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Media_UploadLessonDocument_OwningRecruiter_CanAttach()
    {
        var (recruiterToken, _, companyId) =
            await RegisterRecruiterWithCompanyAsync("regr.media.owner@example.com");
        var lessonId = await CreateCompanyCourseWithLessonAsync(companyId);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("%PDF-1.4 fake pdf"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "syllabus.pdf");

        var response = await AuthorizedClient(recruiterToken).PostAsync($"/api/media/lessons/{lessonId}/documents", content);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private async Task<int> CreateCompanyCourseWithLessonAsync(int companyId)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var course = new Course
        {
            GenreId = 1,
            CompanyId = companyId,
            Name = "Company Course",
            TechnicalLevel = 2,
            Description = "Owned course",
            Price = 1000,
        };
        db.Courses.Add(course);
        await db.SaveChangesAsync();
        var module = new CourseModule { CourseId = course.CourseId, Name = "Module 1", Order = 1 };
        db.CourseModules.Add(module);
        await db.SaveChangesAsync();
        var lesson = new Lesson { ModuleId = module.ModuleId, CourseId = course.CourseId, Name = "Lesson 1" };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();
        return lesson.LessonId;
    }

    // ------------------------------------------------------------------ //
    // Helpers
    // ------------------------------------------------------------------ //

    private async Task<(string Token, int UserId, int CompanyId)> RegisterRecruiterWithCompanyAsync(string email)
    {
        var response = await RegisterCompanyAsync(new
        {
            companyName = "Acme Corp",
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

    private async Task<int> CreatePostAsync(string token, int companyId, string title)
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
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var subDiscipline = new SubDiscipline
        {
            DisciplineId = 1,
            Name = "Computer Science",
            Description = "CS",
        };
        db.SubDisciplines.Add(subDiscipline);
        await db.SaveChangesAsync();

        var genre = new Genre
        {
            SubDisciplineId = subDiscipline.SubDisciplineId,
            Name = "Web Development",
            Description = "Web",
        };
        db.Genres.Add(genre);
        await db.SaveChangesAsync();

        return genre.GenreId;
    }

    private async Task<(int CourseId, List<int> LessonIds)> CreateCourseWithLessonsAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var subDiscipline = new SubDiscipline
        {
            DisciplineId = 1,
            Name = "Computer Science",
            Description = "CS",
        };
        db.SubDisciplines.Add(subDiscipline);
        await db.SaveChangesAsync();

        var genre = new Genre
        {
            SubDisciplineId = subDiscipline.SubDisciplineId,
            Name = "Web Development",
            Description = "Web",
        };
        db.Genres.Add(genre);
        await db.SaveChangesAsync();

        var course = new Course
        {
            GenreId = genre.GenreId,
            Name = "Modern Web Development",
            TechnicalLevel = 3,
            Description = "Build production-ready web apps",
            Price = 5000,
        };
        db.Courses.Add(course);
        await db.SaveChangesAsync();

        var lessonIds = new List<int>();
        var lessonSpecs = new[] { ("HTML Fundamentals", 1), ("CSS Styling", 2) };
        foreach (var (name, order) in lessonSpecs)
        {
            var module = new CourseModule { CourseId = course.CourseId, Name = $"Module {order}", Order = order };
            db.CourseModules.Add(module);
            await db.SaveChangesAsync();

            var lesson = new Lesson { ModuleId = module.ModuleId, CourseId = course.CourseId, Name = name, Description = name };
            db.Lessons.Add(lesson);
            await db.SaveChangesAsync();

            db.LessonContents.Add(new LessonContent
            {
                LessonId = lesson.LessonId,
                BlockType = "text",
                Content = $"Content for {name}",
                LessonOrder = order,
                TopicOrder = 1,
            });
            await db.SaveChangesAsync();

            lessonIds.Add(lesson.LessonId);
        }

        return (course.CourseId, lessonIds);
    }
}
