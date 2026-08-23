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

    private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private async Task<int?> GetUserCompanyIdAsync()
        => (await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == UserId))?.CompanyId;

    [HttpGet("posts/{postId}/rank-applicants")]
    public async Task<ActionResult<RankCandidatesResponse>> RankApplicants(int postId)
    {
        var companyId = await GetUserCompanyIdAsync();
        if (companyId == null)
            return BadRequest(new { error = "No company associated with this account" });

        _logger.LogInformation("HTTP GET /api/hiring-agent/posts/{PostId}/rank-applicants by user {UserId}", postId, UserId);
        var response = await _agent.RankApplicantsAsync(UserId, postId);
        return Ok(response);
    }

    [HttpPost("posts/draft")]
    public async Task<ActionResult<DraftJobPostResponse>> DraftJobPost([FromBody] DraftJobPostRequest request)
    {
        var companyId = await GetUserCompanyIdAsync();
        if (companyId == null)
            return BadRequest(new { error = "No company associated with this account" });

        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.TargetRole))
            return BadRequest(new { error = "Title and TargetRole are required" });

        _logger.LogInformation("HTTP POST /api/hiring-agent/posts/draft by user {UserId}", UserId);
        var draft = await _agent.DraftJobPostAsync(UserId, request);
        if (draft == null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "AI drafting is unavailable right now. Please fill in the job details manually." });
        return Ok(draft);
    }

    [HttpPost("posts/{postId}/screening-questions")]
    public async Task<ActionResult<ScreeningQuestionsResponse>> GenerateScreeningQuestions(
        int postId, [FromQuery] int perSkill = 3)
    {
        var companyId = await GetUserCompanyIdAsync();
        if (companyId == null)
            return BadRequest(new { error = "No company associated with this account" });

        _logger.LogInformation("HTTP POST /api/hiring-agent/posts/{PostId}/screening-questions by user {UserId}", postId, UserId);
        var response = await _agent.GenerateScreeningQuestionsAsync(UserId, postId, perSkill);
        return Ok(response);
    }
}
