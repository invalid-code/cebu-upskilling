using System.Security.Claims;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class EnrollmentsController : BaseEntityController<LearnerStudyCourse>
{
    private readonly IEnrollmentsService _enrollmentsService;

    public EnrollmentsController(
        IEntityService<LearnerStudyCourse> service,
        IEnrollmentsService enrollmentsService,
        ILogger<EnrollmentsController> logger)
        : base(service, logger, "Enrollments")
    {
        _enrollmentsService = enrollmentsService;
    }

    protected override int GetId(LearnerStudyCourse entity) => entity.CourseId;

    [HttpGet]
    [Authorize(Roles = "Learner")]
    public override async Task<ActionResult<List<LearnerStudyCourse>>> GetAll()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP GET /api/enrollments called by user {UserId}", userId);

        var enrollments = await _enrollmentsService.GetMyEnrollmentsAsync(userId);
        if (enrollments == null)
            return BadRequest(new { error = "No learner profile found" });

        return Ok(enrollments);
    }

    [HttpPost]
    [Authorize(Roles = "Learner")]
    public override async Task<ActionResult<LearnerStudyCourse>> Create(LearnerStudyCourse entity)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP POST /api/enrollments called by user {UserId} for course {CourseId}", userId, entity.CourseId);

        var outcome = await _enrollmentsService.EnrollAsync(userId, entity.CourseId);

        if (outcome.Failure == EnrollFailure.NoLearnerProfile)
        {
            _logger.LogWarning("No learner profile found for user {UserId}", userId);
            return BadRequest(new { error = "No learner profile found" });
        }

        if (outcome.Failure == EnrollFailure.CourseNotFound)
        {
            _logger.LogWarning("Course {CourseId} not found", entity.CourseId);
            return NotFound(new { error = "Course not found" });
        }

        if (outcome.Failure == EnrollFailure.AlreadyEnrolled)
        {
            _logger.LogInformation("User {UserId} already enrolled in course {CourseId}", userId, entity.CourseId);
            return Ok(new { message = "Already enrolled" });
        }

        return StatusCode(201, new { outcome.CourseId, outcome.Started });
    }
}
