using System.Security.Claims;
using CebuUpskilling.Backend.Controllers;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Regression coverage for <see cref="CourseGenerationController"/> which previously
/// reported 0% line-rate. Exercises BadRequest paths, exception mapping,
/// auth attribute, and success paths via a fake agent.
/// </summary>
public class CourseGenerationControllerRegressionTests
{
    private sealed class FakeAgent : ICourseGenerationAgent
    {
        public Func<int, CourseGenerationRequest, CancellationToken, Task<CourseGenerationDraftEnvelope>>? GenerateFunc;
        public Func<int, CommitCourseGenerationRequest, CancellationToken, Task<CommitCourseGenerationResponse?>>? CommitFunc;

        public Task<CourseGenerationDraftEnvelope> GenerateAsync(int userId, CourseGenerationRequest request, CancellationToken ct = default)
            => GenerateFunc != null ? GenerateFunc(userId, request, ct) : Task.FromResult(new CourseGenerationDraftEnvelope { Draft = SampleDraft(), SkillCatalogSize = 1 });

        public Task<CommitCourseGenerationResponse?> CommitAsync(int userId, CommitCourseGenerationRequest request, CancellationToken ct = default)
            => CommitFunc != null ? CommitFunc(userId, request, ct) : Task.FromResult<CommitCourseGenerationResponse?>(null);
    }

    private static CourseGenerationResult SampleDraft() => new(
        Name: "Drafted Course",
        Description: "Desc",
        TechnicalLevel: 2,
        Mode: "Online",
        Rationale: null,
        Modules: new List<CourseGenerationModuleDraft>
        {
            new("Module 1", null, 0, new List<CourseGenerationLessonDraft> { new("Lesson 1", null, 0) })
        },
        MatchedSkills: new List<CourseGenerationSkillMatch>());

    private static CourseGenerationController CreateController(FakeAgent agent, string? userIdClaim = "42")
    {
        var controller = new CourseGenerationController(agent, NullLogger<CourseGenerationController>.Instance);
        var claims = userIdClaim is null ? new ClaimsPrincipal() : new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userIdClaim) }));
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = claims } };
        return controller;
    }

    [Fact]
    public void Controller_RequiresRecruiterRole()
    {
        var attr = typeof(CourseGenerationController).GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true)
            .Cast<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().Single();
        Assert.Equal("Recruiter", attr.Roles);
    }

    [Fact]
    public async Task Generate_NullRequest_ReturnsBadRequest()
    {
        var controller = CreateController(new FakeAgent());
        var result = await controller.Generate(null!, CancellationToken.None);
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(400, bad.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task Generate_EmptyBrief_ReturnsBadRequest(string? brief)
    {
        var controller = CreateController(new FakeAgent());
        var request = new CourseGenerationRequest(Brief: brief!, TechnicalLevel: 3, Mode: "Online");
        var result = await controller.Generate(request, CancellationToken.None);
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(400, bad.StatusCode);
    }

    [Fact]
    public async Task Generate_MapsUnauthorizedAccessException_To403()
    {
        var agent = new FakeAgent { GenerateFunc = (_, _, _) => throw new UnauthorizedAccessException("Only recruiters") };
        var controller = CreateController(agent);
        var result = await controller.Generate(new CourseGenerationRequest("Valid brief"), CancellationToken.None);
        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, status.StatusCode);
    }

    [Fact]
    public async Task Generate_MapsArgumentException_To400()
    {
        var agent = new FakeAgent { GenerateFunc = (_, _, _) => throw new ArgumentException("Bad brief") };
        var controller = CreateController(agent);
        var result = await controller.Generate(new CourseGenerationRequest("Valid brief"), CancellationToken.None);
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(400, bad.StatusCode);
    }

    [Fact]
    public async Task Generate_MapsInvalidOperationException_To502()
    {
        var agent = new FakeAgent { GenerateFunc = (_, _, _) => throw new InvalidOperationException("AI failed") };
        var controller = CreateController(agent);
        var result = await controller.Generate(new CourseGenerationRequest("Valid brief"), CancellationToken.None);
        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status502BadGateway, status.StatusCode);
    }

    [Fact]
    public async Task Generate_Success_ReturnsOkWithDraft()
    {
        var draft = SampleDraft();
        var agent = new FakeAgent { GenerateFunc = (_, _, _) => Task.FromResult(new CourseGenerationDraftEnvelope { Draft = draft, SkillCatalogSize = 5 }) };
        var controller = CreateController(agent);
        var result = await controller.Generate(new CourseGenerationRequest("Valid brief"), CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(draft, ok.Value);
    }

    [Fact]
    public async Task Commit_NullDraft_ReturnsBadRequest()
    {
        var controller = CreateController(new FakeAgent());
        var result = await controller.Commit(new CommitCourseGenerationRequest(null!, null, null), CancellationToken.None);
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(400, bad.StatusCode);
    }

    [Fact]
    public async Task Commit_NullRequest_ReturnsBadRequest()
    {
        var controller = CreateController(new FakeAgent());
        var result = await controller.Commit(null!, CancellationToken.None);
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(400, bad.StatusCode);
    }

    [Fact]
    public async Task Commit_WhenAgentReturnsNull_ReturnsForbid()
    {
        var agent = new FakeAgent { CommitFunc = (_, _, _) => Task.FromResult<CommitCourseGenerationResponse?>(null) };
        var controller = CreateController(agent);
        var result = await controller.Commit(new CommitCourseGenerationRequest(SampleDraft(), null, null), CancellationToken.None);
        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task Commit_Success_ReturnsCreated()
    {
        var response = new CommitCourseGenerationResponse(99, "Created Course", "Draft");
        var agent = new FakeAgent { CommitFunc = (_, _, _) => Task.FromResult<CommitCourseGenerationResponse?>(response) };
        var controller = CreateController(agent);
        var result = await controller.Commit(new CommitCourseGenerationRequest(SampleDraft(), GenreId: 2, Price: 500), CancellationToken.None);
        var created = Assert.IsType<CreatedResult>(result.Result);
        Assert.Equal("/api/company/courses/99", created.Location);
        Assert.Equal(response, created.Value);
    }
}
