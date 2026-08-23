using System.Security.Claims;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApplicationsController : ControllerBase
{
    private readonly IApplicationsService _service;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ApplicationsController> _logger;

    public ApplicationsController(IApplicationsService service, ApplicationDbContext context, ILogger<ApplicationsController> logger)
    {
        _service = service;
        _context = context;
        _logger = logger;
    }

    private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private async Task<int?> GetUserCompanyIdAsync()
        => (await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == UserId))?.CompanyId;

    [HttpGet]
    public async Task<ActionResult<List<ApplicationSummary>>> GetMine()
    {
        _logger.LogInformation("HTTP GET /api/applications called by user {UserId}", UserId);
        var applications = await _service.GetMyApplicationsAsync(UserId);
        return Ok(applications);
    }

    [HttpPost]
    public async Task<ActionResult> Apply([FromBody] ApplyRequest request)
    {
        _logger.LogInformation("HTTP POST /api/applications called by user {UserId} for post {PostId}", UserId, request.PostId);
        var outcome = await _service.ApplyAsync(UserId, request.PostId, request.ResumeUrl, request.CoverLetterUrl);

        if (outcome.Failure == ApplyFailure.NoLearnerProfile)
            return BadRequest(new { error = "No learner profile found" });
        if (outcome.Failure == ApplyFailure.PostNotFound)
            return NotFound(new { error = "Post not found" });
        if (outcome.Failure == ApplyFailure.AlreadyApplied)
            return Ok(outcome.Application);

        return StatusCode(201, outcome.Application);
    }

    [HttpPatch("{postId}")]
    public async Task<ActionResult> UpdateStatus(int postId, [FromBody] UpdateApplicationStatusRequest request)
    {
        _logger.LogInformation("HTTP PATCH /api/applications/{PostId} called by user {UserId}", postId, UserId);
        var updated = await _service.UpdateStatusAsync(UserId, postId, request.Status);
        if (!updated) return NotFound(new { error = "Application not found" });
        return Ok(new { message = "updated" });
    }

    [HttpGet("employer")]
    [Authorize(Roles = "Recruiter")]
    public async Task<ActionResult<List<ApplicationEmployerSummary>>> GetCompanyApplications()
    {
        var companyId = await GetUserCompanyIdAsync();
        if (companyId == null)
        {
            return BadRequest(new { error = "No company associated with this account" });
        }

        _logger.LogInformation("HTTP GET /api/applications/employer called by user {UserId}", UserId);
        var applications = await _service.GetCompanyApplicationsAsync(companyId.Value);
        return Ok(applications);
    }

    [HttpPatch("employer/{applicationId}")]
    [Authorize(Roles = "Recruiter")]
    public async Task<ActionResult> UpdateApplicationStatus(int applicationId, [FromBody] EmployerUpdateApplicationStatusRequest request)
    {
        var companyId = await GetUserCompanyIdAsync();
        if (companyId == null)
        {
            return BadRequest(new { error = "No company associated with this account" });
        }

        _logger.LogInformation("HTTP PATCH /api/applications/employer/{ApplicationId} called by user {UserId}", applicationId, UserId);
        var outcome = await _service.UpdateApplicationStatusAsync(companyId.Value, applicationId, request.Status);

        if (outcome.Failure == EmployerApplicationFailure.ApplicationNotFound)
            return NotFound(new { error = "Application not found" });
        if (outcome.Failure == EmployerApplicationFailure.NotYourApplication)
            return Forbid();
        if (outcome.Failure == EmployerApplicationFailure.InvalidStatus)
            return BadRequest(new { error = "Invalid status" });

        return Ok(outcome.Application);
    }

    [HttpGet("employer/{applicationId}")]
    [Authorize(Roles = "Recruiter")]
    public async Task<ActionResult<ApplicationEmployerDetailDto>> GetCompanyApplicationDetail(int applicationId)
    {
        var companyId = await GetUserCompanyIdAsync();
        if (companyId == null)
        {
            return BadRequest(new { error = "No company associated with this account" });
        }

        _logger.LogInformation("HTTP GET /api/applications/employer/{ApplicationId} called by user {UserId}", applicationId, UserId);
        var outcome = await _service.GetCompanyApplicationDetailAsync(companyId.Value, applicationId);

        if (outcome.Failure == EmployerApplicationFailure.ApplicationNotFound)
            return NotFound(new { error = "Application not found" });
        if (outcome.Failure == EmployerApplicationFailure.NotYourApplication)
            return Forbid();

        return Ok(outcome.Application);
    }
}