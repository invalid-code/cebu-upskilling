using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/company/courses/generate")]
[Authorize(Roles = "Recruiter")]
public class CourseGenerationController : ControllerBase
{
    private readonly ICourseGenerationAgent _agent;
    private readonly ILogger<CourseGenerationController> _logger;

    public CourseGenerationController(ICourseGenerationAgent agent, ILogger<CourseGenerationController> logger)
    {
        _agent = agent;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<CourseGenerationResult>> Generate([FromBody] CourseGenerationRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Brief))
        {
            return BadRequest(new { error = "Brief is required" });
        }

        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized(new { error = "Invalid authentication token" });
        }
        _logger.LogInformation("HTTP POST /api/company/courses/generate called by user {UserId}", userId);

        try
        {
            var envelope = await _agent.GenerateAsync(userId, request, ct);
            return Ok(envelope.Draft);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }

    [HttpPost("commit")]
    public async Task<ActionResult<CommitCourseGenerationResponse>> Commit([FromBody] CommitCourseGenerationRequest request, CancellationToken ct)
    {
        if (request?.Draft is null)
        {
            return BadRequest(new { error = "Draft is required" });
        }

        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized(new { error = "Invalid authentication token" });
        }
        _logger.LogInformation("HTTP POST /api/company/courses/generate/commit called by user {UserId}", userId);

        var result = await _agent.CommitAsync(userId, request, ct);
        if (result is null)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Not authorized to commit this course or draft is invalid" });
        }

        return Created($"/api/company/courses/{result.CourseId}", result);
    }
}
