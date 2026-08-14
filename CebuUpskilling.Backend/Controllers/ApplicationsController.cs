using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/applications")]
[Authorize]
public class ApplicationsController : ControllerBase
{
    private readonly IApplicationsService _service;
    private readonly ILogger<ApplicationsController> _logger;

    public ApplicationsController(IApplicationsService service, ILogger<ApplicationsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet]
    public async Task<ActionResult<List<ApplicationSummary>>> GetMine()
    {
        var applications = await _service.GetMyApplicationsAsync(UserId);
        return Ok(applications);
    }

    [HttpPost]
    public async Task<ActionResult> Apply([FromBody] ApplyRequest request)
    {
        var outcome = await _service.ApplyAsync(UserId, request.PostId);

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
        var updated = await _service.UpdateStatusAsync(UserId, postId, request.Status);
        if (!updated) return NotFound(new { error = "Application not found" });
        return Ok(new { message = "updated" });
    }
}
