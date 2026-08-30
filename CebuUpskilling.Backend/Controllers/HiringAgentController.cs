using System.Security.Claims;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Controllers;

/// <summary>
/// Employer-side AI hiring agent endpoints (Recruiter only): candidate ranking,
/// job-post drafting, and screening question generation.
/// </summary>
[ApiController]
[Route("api/hiring-agent")]
[Authorize(Roles = "Recruiter")]
public class HiringAgentController : ControllerBase
{
    private readonly IEmployerHiringAgent _agent;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<HiringAgentController> _logger;

    public HiringAgentController(
        IEmployerHiringAgent agent,
        ApplicationDbContext context,
        ILogger<HiringAgentController> logger)
    {
        _agent = agent;
        _context = context;
        _logger = logger;
    }

    // Same safe claim-parsing pattern as CompaniesController: a missing or
    // malformed NameIdentifier claim must yield 401, never a 500.
    private int? GetCurrentUserId()
        => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    private async Task<int?> GetUserCompanyIdAsync(int userId)
        => (await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId))?.CompanyId;

    /// <summary>
    /// Post ownership guard (IDOR): the caller may only act on job posts that
    /// belong to their own company. Returns null when access is allowed,
    /// otherwise 404 — for both unknown posts and posts owned by another
    /// company, matching <see cref="PostsController"/> so responses cannot be
    /// used to enumerate which post IDs exist (audit detail is logged instead).
    /// </summary>
    private async Task<ActionResult?> ValidatePostOwnershipAsync(int postId, int companyId)
    {
        var postCompanyId = await _context.Posts.AsNoTracking()
            .Where(p => p.PostId == postId)
            .Select(p => (int?)p.CompanyId)
            .FirstOrDefaultAsync();

        if (postCompanyId == null)
            return NotFound(new { error = $"Job post {postId} not found" });

        if (postCompanyId.Value != companyId)
        {
            _logger.LogWarning(
                "Company {CompanyId} was denied access to post {PostId} owned by company {OwnerCompanyId}",
                companyId, postId, postCompanyId.Value);
            return NotFound(new { error = $"Job post {postId} not found" });
        }

        return null;
    }

    [HttpGet("posts/{postId}/rank-applicants")]
    public async Task<ActionResult<RankCandidatesResponse>> RankApplicants(int postId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { error = "Invalid token" });

        var companyId = await GetUserCompanyIdAsync(userId.Value);
        if (companyId == null)
            return BadRequest(new { error = "No company associated with this account" });

        if (await ValidatePostOwnershipAsync(postId, companyId.Value) is { } failure)
            return failure;

        _logger.LogInformation("HTTP GET /api/hiring-agent/posts/{PostId}/rank-applicants by user {UserId}", postId, userId.Value);
        var response = await _agent.RankApplicantsAsync(userId.Value, postId, companyId.Value);
        return Ok(response);
    }

    [HttpPost("posts/draft")]
    public async Task<ActionResult<DraftJobPostResponse>> DraftJobPost([FromBody] DraftJobPostRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { error = "Invalid token" });

        var companyId = await GetUserCompanyIdAsync(userId.Value);
        if (companyId == null)
            return BadRequest(new { error = "No company associated with this account" });

        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.TargetRole))
            return BadRequest(new { error = "Title and TargetRole are required" });

        _logger.LogInformation("HTTP POST /api/hiring-agent/posts/draft by user {UserId}", userId.Value);
        var draft = await _agent.DraftJobPostAsync(userId.Value, request);
        if (draft == null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "AI drafting is unavailable right now. Please fill in the job details manually." });
        return Ok(draft);
    }

    [HttpPost("posts/{postId}/screening-questions")]
    public async Task<ActionResult<ScreeningQuestionsResponse>> GenerateScreeningQuestions(
        int postId, [FromQuery] int perSkill = 3)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { error = "Invalid token" });

        var companyId = await GetUserCompanyIdAsync(userId.Value);
        if (companyId == null)
            return BadRequest(new { error = "No company associated with this account" });

        if (await ValidatePostOwnershipAsync(postId, companyId.Value) is { } failure)
            return failure;

        _logger.LogInformation("HTTP POST /api/hiring-agent/posts/{PostId}/screening-questions by user {UserId}", postId, userId.Value);
        var response = await _agent.GenerateScreeningQuestionsAsync(userId.Value, postId, companyId.Value, perSkill);
        return Ok(response);
    }
}
