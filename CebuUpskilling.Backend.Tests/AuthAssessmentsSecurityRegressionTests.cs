using System.Security.Claims;
using CebuUpskilling.Backend.Controllers;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Fills the remaining security-relevant 0% branches:
/// - <see cref="AuthController"/> disabled CRUD (mass disclosure / IDOR guard) at
///   <c>AuthController.cs:22,41,45,49</c>
/// - <see cref="AssessmentsController"/> GetId + LogIntegrityEvent at <c>AssessmentsController.cs:23,109-115</c>
/// These endpoints must never expose raw <see cref="AppUser"/> and must log
/// proctoring events without leaking.
/// </summary>
public class AuthAssessmentsSecurityRegressionTests
{
    private sealed class FakeEntityService<T> : IEntityService<T> where T : class
    {
        public Task<List<T>> GetAllAsync() => Task.FromResult(new List<T>());
        public Task<T?> GetByIdAsync(int id) => Task.FromResult<T?>(null);
        public Task<T> CreateAsync(T entity) => Task.FromResult(entity);
        public Task<T?> UpdateAsync(int id, T entity) => Task.FromResult<T?>(null);
        public Task<bool> DeleteAsync(int id) => Task.FromResult(false);
    }

    private sealed class FakeAuthService : IAuthService
    {
        public Task<AuthResponse> RegisterAsync(RegisterRequest r) => throw new NotImplementedException();
        public Task<CompanyRegisterResponse> CompanyRegisterAsync(CompanyRegisterRequest r) => throw new NotImplementedException();
        public Task<AuthResponse> LoginAsync(LoginRequest r) => throw new NotImplementedException();
        public Task<AuthResponse> GoogleAuthAsync(GoogleAuthRequest r) => throw new NotImplementedException();
        public Task<AuthResponse> UpdateProfileAsync(int userId, UpdateProfileRequest r) => throw new NotImplementedException();
        public Task LogoutAsync(string? jti) => Task.CompletedTask;
        public Task<bool> ConfirmEmailAsync(string email, string token) => Task.FromResult(false);
        public Task SendEmailConfirmationAsync(string email) => Task.CompletedTask;
        public Task SendPasswordResetAsync(string email) => Task.CompletedTask;
        public Task<bool> ResetPasswordAsync(string email, string token, string newPassword) => Task.FromResult(false);
    }

    private sealed class FakeJobseekerAgent : IJobseekerSkillParserAgent
    {
        public Task<List<AssessmentResultResponse>> GetRecentResultsAsync(int userId) => Task.FromResult(new List<AssessmentResultResponse>());
        public Task<AvailableAssessmentsResponse?> GetAvailableAssessmentsAsync(int userId) => Task.FromResult<AvailableAssessmentsResponse?>(null);
        public Task<RecommendedAssessmentResponse?> GetRecommendedAsync(int userId) => Task.FromResult<RecommendedAssessmentResponse?>(null);
        public Task<StartAssessmentResponse?> StartAssessmentAsync(int userId, StartAssessmentRequest request) => Task.FromResult<StartAssessmentResponse?>(null);
        public Task<AssessmentQuestionsResponse?> GetQuestionsAsync(int userId, int assessmentId) => Task.FromResult<AssessmentQuestionsResponse?>(null);
        public Task<SubmitAssessmentResponse?> SubmitAssessmentAsync(int userId, int assessmentId, SubmitAssessmentRequest request) => Task.FromResult<SubmitAssessmentResponse?>(null);
        public Task<CreatedCompanyQuestionResponse?> CreateCompanyQuestionAsync(int userId, CreateCompanyQuestionRequest request) => Task.FromResult<CreatedCompanyQuestionResponse?>(null);
        public Task<ParseSkillsResult> ParseAndCreateAssessmentsAsync(int userId, string resumeText, CancellationToken ct = default) => Task.FromResult(new ParseSkillsResult(new List<ParsedSkillResult>()));
    }

    [Fact]
    public async Task AuthController_DisabledCrud_AlwaysReturnsNotFound()
    {
        var controller = new AuthController(new FakeEntityService<AppUser>(), new FakeAuthService(), NullLogger<AuthController>.Instance);

        Assert.IsType<NotFoundResult>((await controller.GetAll()).Result);
        Assert.IsType<NotFoundResult>((await controller.GetById(999)).Result);
        Assert.IsType<NotFoundResult>((await controller.Create(new AppUser { FirstName = "Hacker", LastName = "X", EmailAddress = "h@x.com", PasswordHash = "h", Role = "Admin" })).Result);
        Assert.IsType<NotFoundResult>((await controller.Update(1, new AppUser())).Result);
        Assert.IsType<NotFoundResult>(await controller.Delete(1));
    }

    [Fact]
    public void AuthController_GetId_ReturnsUserId()
    {
        var controller = new AuthController(new FakeEntityService<AppUser>(), new FakeAuthService(), NullLogger<AuthController>.Instance);
        var method = typeof(AuthController).GetMethod("GetId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var id = (int)method.Invoke(controller, new object[] { new AppUser { UserId = 42 } })!;
        Assert.Equal(42, id);
    }

    [Fact]
    public void AssessmentsController_GetId_ReturnsAssessmentId()
    {
        var controller = new AssessmentsController(new FakeEntityService<LearnerAssessment>(), new FakeJobseekerAgent(), NullLogger<AssessmentsController>.Instance);
        var method = typeof(AssessmentsController).GetMethod("GetId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var id = (int)method.Invoke(controller, new object[] { new LearnerAssessment { LearnerAssessmentId = 77 } })!;
        Assert.Equal(77, id);
    }

    [Fact]
    public void AssessmentsController_LogIntegrityEvent_ReturnsOk_WithRecordedTrue()
    {
        var controller = new AssessmentsController(new FakeEntityService<LearnerAssessment>(), new FakeJobseekerAgent(), NullLogger<AssessmentsController>.Instance);
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "123") }));
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = claims } };

        var result = controller.LogIntegrityEvent(5, new LogIntegrityEventRequest("visibilitychange", "hidden"));
        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("recorded", json);
        Assert.Contains("true", json);
    }

    [Fact]
    public void AssessmentsController_LogIntegrityEvent_WithNullDetail_StillOk()
    {
        var controller = new AssessmentsController(new FakeEntityService<LearnerAssessment>(), new FakeJobseekerAgent(), NullLogger<AssessmentsController>.Instance);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "1") })) } };
        var result = controller.LogIntegrityEvent(1, new LogIntegrityEventRequest("blur", null));
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public void AssessmentsController_HasLearnerAuthorizeAttributes()
    {
        foreach (var name in new[] { "GetRecentResults", "GetAvailableAssessments", "GetRecommended", "StartAssessment", "GetQuestions", "SubmitAssessment", "LogIntegrityEvent" })
        {
            var method = typeof(AssessmentsController).GetMethod(name)!;
            var attr = method.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true)
                .Cast<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().Single();
            Assert.Equal("Learner", attr.Roles);
        }
        var companyMethod = typeof(AssessmentsController).GetMethod("CreateCompanyQuestion")!;
        var compAttr = companyMethod.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true)
            .Cast<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().Single();
        Assert.Equal("Recruiter", compAttr.Roles);
    }
}
