using System.Security.Claims;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EnrollmentsController : ControllerBase
{
    private readonly IEnrollmentsService _enrollmentsService;
    private readonly ILogger<EnrollmentsController> _logger;

    public EnrollmentsController(IEnrollmentsService enrollmentsService, ILogger<EnrollmentsController> logger)
    {
        _enrollmentsService = enrollmentsService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyEnrollments()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var enrollments = await _enrollmentsService.GetMyEnrollmentsAsync(userId);
        if (enrollments == null)
            return BadRequest(new { error = "No learner profile found" });

        return Ok(enrollments);
    }

    [HttpPost]
    public async Task<IActionResult> Enroll([FromBody] EnrollRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var outcome = await _enrollmentsService.EnrollAsync(userId, request.CourseId);

        if (outcome.Failure == EnrollFailure.NoLearnerProfile)
        {
            _logger.LogWarning("No learner profile found for user {UserId}", userId);
            return BadRequest(new { error = "No learner profile found" });
        }

        if (outcome.Failure == EnrollFailure.CourseNotFound)
        {
            _logger.LogWarning("Course {CourseId} not found", request.CourseId);
            return NotFound(new { error = "Course not found" });
        }

        if (outcome.Failure == EnrollFailure.AlreadyEnrolled)
        {
            _logger.LogInformation("User {UserId} already enrolled in course {CourseId}", userId, request.CourseId);
            return Ok(new { message = "Already enrolled" });
        }

        return StatusCode(201, new { outcome.CourseId, outcome.Started });
    }
}

public record EnrollRequest(int CourseId);