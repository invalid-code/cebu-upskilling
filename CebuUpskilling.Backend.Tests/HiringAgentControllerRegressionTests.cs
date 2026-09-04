using System.Security.Claims;
using CebuUpskilling.Backend.Controllers;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Regression coverage for <see cref="HiringAgentController"/> which previously
/// reported 0% line-rate. Exercises auth, company, post-ownership (IDOR),
/// and AI-delegation branches via fakes and an InMemory DB.
/// </summary>
public class HiringAgentControllerRegressionTests
{
    private sealed class FakeAgent : IEmployerHiringAgent
    {
        public RankCandidatesResponse? RankResponse { get; set; } = new RankCandidatesResponse(1, false, new());
        public DraftJobPostResponse? DraftResponse { get; set; }
        public ScreeningQuestionsResponse? ScreeningResponse { get; set; } = new ScreeningQuestionsResponse(1, new());
        public int RankCalls { get; private set; }
        public int DraftCalls { get; private set; }
        public int ScreeningCalls { get; private set; }

        public Task<RankCandidatesResponse> RankApplicantsAsync(int userId, int postId, int companyId, CancellationToken ct = default)
        {
            RankCalls++;
            return Task.FromResult(RankResponse ?? new RankCandidatesResponse(postId, false, new()));
        }

        public Task<DraftJobPostResponse?> DraftJobPostAsync(int userId, DraftJobPostRequest request, CancellationToken ct = default)
        {
            DraftCalls++;
            return Task.FromResult(DraftResponse);
        }

        public Task<ScreeningQuestionsResponse> GenerateScreeningQuestionsAsync(int userId, int postId, int companyId, int perSkill = 3, CancellationToken ct = default)
        {
            ScreeningCalls++;
            return Task.FromResult(ScreeningResponse ?? new ScreeningQuestionsResponse(postId, new()));
        }
    }

    private static HiringAgentController CreateController(ApplicationDbContext ctx, FakeAgent agent, ClaimsPrincipal? user = null)
    {
        var controller = new HiringAgentController(agent, ctx, NullLogger<HiringAgentController>.Instance);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = user ?? new ClaimsPrincipal() } };
        return controller;
    }

    private static ClaimsPrincipal Principal(string userId) =>
        new(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId) }));

    private static async Task<(ApplicationDbContext Ctx, Company Company, AppUser Recruiter, Post Post)> SeedAsync()
    {
        var ctx = TestDbContextFactory.Create();
        var company = new Company { Name = "Hiring Corp" };
        ctx.Companies.Add(company);
        await ctx.SaveChangesAsync();
        var recruiter = new AppUser { FirstName = "Rec", LastName = "One", EmailAddress = $"rec-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Recruiter", CompanyId = company.CompanyId };
        ctx.Users.Add(recruiter);
        await ctx.SaveChangesAsync();
        var post = new Post { CompanyId = company.CompanyId, Title = "Backend Engineer", TargetRole = "Backend Developer", Description = "Desc", CreatedAt = DateTime.UtcNow };
        ctx.Posts.Add(post);
        await ctx.SaveChangesAsync();
        return (ctx, company, recruiter, post);
    }

    [Fact]
    public void Controller_RequiresRecruiterRole()
    {
        var attr = typeof(HiringAgentController).GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true)
            .Cast<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().Single();
        Assert.Equal("Recruiter", attr.Roles);
    }

    // ---- RankApplicants ----

    [Fact]
    public async Task Rank_MissingClaim_ReturnsUnauthorized()
    {
        var (ctx, _, _, post) = await SeedAsync();
        var controller = CreateController(ctx, new FakeAgent(), user: new ClaimsPrincipal());
        var result = await controller.RankApplicants(post.PostId);
        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Rank_MalformedClaim_ReturnsUnauthorized()
    {
        var (ctx, _, _, post) = await SeedAsync();
        var controller = CreateController(ctx, new FakeAgent(), Principal("not-an-int"));
        var result = await controller.RankApplicants(post.PostId);
        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Rank_UserWithoutCompany_ReturnsBadRequest()
    {
        var ctx = TestDbContextFactory.Create();
        var user = new AppUser { FirstName = "Lonely", LastName = "Recruiter", EmailAddress = $"lonely-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Recruiter", CompanyId = null };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();
        var controller = CreateController(ctx, new FakeAgent(), Principal(user.UserId.ToString()));
        var result = await controller.RankApplicants(999);
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(400, bad.StatusCode);
    }

    [Fact]
    public async Task Rank_UnknownPost_ReturnsNotFound()
    {
        var (ctx, _, recruiter, _) = await SeedAsync();
        var controller = CreateController(ctx, new FakeAgent(), Principal(recruiter.UserId.ToString()));
        var result = await controller.RankApplicants(999999);
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Rank_PostOwnedByOtherCompany_ReturnsNotFound_AndDoesNotCallAgent()
    {
        var (ctx, _, _, _) = await SeedAsync();
        var otherCompany = new Company { Name = "Rival Corp" };
        ctx.Companies.Add(otherCompany);
        await ctx.SaveChangesAsync();
        var otherRecruiter = new AppUser { FirstName = "Other", LastName = "Rec", EmailAddress = $"other-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Recruiter", CompanyId = otherCompany.CompanyId };
        ctx.Users.Add(otherRecruiter);
        var otherPost = new Post { CompanyId = otherCompany.CompanyId, Title = "Other Role", TargetRole = "Other", Description = "Desc", CreatedAt = DateTime.UtcNow };
        ctx.Posts.Add(otherPost);
        await ctx.SaveChangesAsync();

        var firstRecruiter = ctx.Users.First(u => u.CompanyId != otherCompany.CompanyId && u.Role == "Recruiter");
        var agent = new FakeAgent();
        var controller = CreateController(ctx, agent, Principal(firstRecruiter.UserId.ToString()));
        var result = await controller.RankApplicants(otherPost.PostId);
        Assert.IsType<NotFoundObjectResult>(result.Result);
        Assert.Equal(0, agent.RankCalls);
    }

    [Fact]
    public async Task Rank_OwnedPost_ReturnsOk_AndCallsAgent()
    {
        var (ctx, company, recruiter, post) = await SeedAsync();
        var expected = new RankCandidatesResponse(post.PostId, true, new List<RankedCandidateDto> { new(1, 1, "Ana Tan", "applied", DateTime.UtcNow, 92, "Great", new List<string> { "React" }) });
        var agent = new FakeAgent { RankResponse = expected };
        var controller = CreateController(ctx, agent, Principal(recruiter.UserId.ToString()));
        var result = await controller.RankApplicants(post.PostId);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expected, ok.Value);
        Assert.Equal(1, agent.RankCalls);
    }

    // ---- DraftJobPost ----

    [Fact]
    public async Task Draft_MissingClaim_ReturnsUnauthorized()
    {
        var (ctx, _, _, _) = await SeedAsync();
        var controller = CreateController(ctx, new FakeAgent(), new ClaimsPrincipal());
        var result = await controller.DraftJobPost(new DraftJobPostRequest("T", "R", null, null, null, null));
        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Draft_UserWithoutCompany_ReturnsBadRequest()
    {
        var ctx = TestDbContextFactory.Create();
        var user = new AppUser { FirstName = "NoCo", LastName = "User", EmailAddress = $"noco-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Recruiter", CompanyId = null };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();
        var controller = CreateController(ctx, new FakeAgent(), Principal(user.UserId.ToString()));
        var result = await controller.DraftJobPost(new DraftJobPostRequest("Title", "Backend Developer", null, null, null, null));
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Theory]
    [InlineData("", "Backend Developer")]
    [InlineData("Title", "")]
    [InlineData("   ", "Backend Developer")]
    [InlineData("Title", "   ")]
    public async Task Draft_MissingTitleOrTargetRole_ReturnsBadRequest(string title, string targetRole)
    {
        var (ctx, _, recruiter, _) = await SeedAsync();
        var controller = CreateController(ctx, new FakeAgent(), Principal(recruiter.UserId.ToString()));
        var result = await controller.DraftJobPost(new DraftJobPostRequest(title, targetRole, null, null, null, null));
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Draft_AiUnavailable_Returns503()
    {
        var (ctx, _, recruiter, _) = await SeedAsync();
        var agent = new FakeAgent { DraftResponse = null };
        var controller = CreateController(ctx, agent, Principal(recruiter.UserId.ToString()));
        var result = await controller.DraftJobPost(new DraftJobPostRequest("Title", "Backend Developer", null, null, null, null));
        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, status.StatusCode);
    }

    [Fact]
    public async Task Draft_Success_ReturnsOk()
    {
        var (ctx, _, recruiter, _) = await SeedAsync();
        var draft = new DraftJobPostResponse("Desc", "Reqs", "Benefits", new List<string> { "Go" });
        var agent = new FakeAgent { DraftResponse = draft };
        var controller = CreateController(ctx, agent, Principal(recruiter.UserId.ToString()));
        var result = await controller.DraftJobPost(new DraftJobPostRequest("Title", "Backend Developer", null, null, null, null));
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(draft, ok.Value);
    }

    // ---- GenerateScreeningQuestions ----

    [Fact]
    public async Task Screening_MissingClaim_ReturnsUnauthorized()
    {
        var (ctx, _, _, post) = await SeedAsync();
        var controller = CreateController(ctx, new FakeAgent(), new ClaimsPrincipal());
        var result = await controller.GenerateScreeningQuestions(post.PostId);
        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Screening_UnknownPost_ReturnsNotFound()
    {
        var (ctx, _, recruiter, _) = await SeedAsync();
        var controller = CreateController(ctx, new FakeAgent(), Principal(recruiter.UserId.ToString()));
        var result = await controller.GenerateScreeningQuestions(999999);
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Screening_PostOwnedByOtherCompany_ReturnsNotFound()
    {
        var (ctx, _, _, _) = await SeedAsync();
        var otherCompany = new Company { Name = "Other2" };
        ctx.Companies.Add(otherCompany);
        await ctx.SaveChangesAsync();
        var otherPost = new Post { CompanyId = otherCompany.CompanyId, Title = "Other", TargetRole = "Other", Description = "Desc", CreatedAt = DateTime.UtcNow };
        ctx.Posts.Add(otherPost);
        await ctx.SaveChangesAsync();
        var recruiter = ctx.Users.First(u => u.Role == "Recruiter" && u.CompanyId != otherCompany.CompanyId);
        var controller = CreateController(ctx, new FakeAgent(), Principal(recruiter.UserId.ToString()));
        var result = await controller.GenerateScreeningQuestions(otherPost.PostId, perSkill: 2);
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Screening_Success_ReturnsOk()
    {
        var (ctx, _, recruiter, post) = await SeedAsync();
        var expected = new ScreeningQuestionsResponse(post.PostId, new List<CreatedCompanyQuestionResponse> { new(1, 1, "Q?", "Company", "Hiring Corp") });
        var agent = new FakeAgent { ScreeningResponse = expected };
        var controller = CreateController(ctx, agent, Principal(recruiter.UserId.ToString()));
        var result = await controller.GenerateScreeningQuestions(post.PostId, perSkill: 3);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expected, ok.Value);
    }

    [Fact]
    public async Task Screening_PerSkillClamped_StillSucceeds()
    {
        var (ctx, _, recruiter, post) = await SeedAsync();
        var controller = CreateController(ctx, new FakeAgent(), Principal(recruiter.UserId.ToString()));
        var resultLow = await controller.GenerateScreeningQuestions(post.PostId, perSkill: -10);
        var resultHigh = await controller.GenerateScreeningQuestions(post.PostId, perSkill: 100);
        Assert.IsType<OkObjectResult>(resultLow.Result);
        Assert.IsType<OkObjectResult>(resultHigh.Result);
    }
}
