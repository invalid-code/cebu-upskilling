using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class AssessmentsController : BaseEntityController<LearnerAssessment>
{
    private readonly IAssessmentService _assessmentService;

    public AssessmentsController(
        IEntityService<LearnerAssessment> service,
        IAssessmentService assessmentService,
        ILogger<AssessmentsController> logger)
        : base(service, logger, "Assessments")
    {
        _assessmentService = assessmentService;
    }

    protected override int GetId(LearnerAssessment entity) => entity.LearnerAssessmentId;

    [HttpGet("results")]
    public async Task<ActionResult<List<AssessmentResultResponse>>> GetRecentResults()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("GET /api/assessments/results called by user {UserId}", userId);

        var results = await _assessmentService.GetRecentResultsAsync(userId);
        return Ok(results);
    }

    [HttpGet("available")]
    public async Task<ActionResult<AvailableAssessmentsResponse>> GetAvailableAssessments()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("GET /api/assessments/available called by user {UserId}", userId);

        var result = await _assessmentService.GetAvailableAssessmentsAsync(userId);
        if (result == null)
            return Ok(null);

        return Ok(result);
    }

    [HttpGet("recommended")]
    public async Task<ActionResult<RecommendedAssessmentResponse>> GetRecommended()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("GET /api/assessments/recommended called by user {UserId}", userId);

        var result = await _assessmentService.GetRecommendedAsync(userId);
        if (result == null)
            return Ok(null);

        return Ok(result);
    }

    [HttpPost("start")]
    public async Task<ActionResult<StartAssessmentResponse>> StartAssessment([FromBody] StartAssessmentRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("POST /api/assessments/start called by user {UserId} for skill {SkillId}", userId, request.SkillId);

        var result = await _assessmentService.StartAssessmentAsync(userId, request);
        if (result == null)
            return BadRequest(new { error = "Unable to start assessment" });

        return Ok(result);
    }

    [HttpGet("{assessmentId}/questions")]
    public async Task<ActionResult<AssessmentQuestionsResponse>> GetQuestions(int assessmentId)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("GET /api/assessments/{AssessmentId}/questions called by user {UserId}", assessmentId, userId);

        var result = await _assessmentService.GetQuestionsAsync(userId, assessmentId);
        if (result == null)
            return NotFound(new { error = "Assessment not found" });

        return Ok(result);
    }

    [HttpPost("{assessmentId}/submit")]
    public async Task<ActionResult<SubmitAssessmentResponse>> SubmitAssessment(int assessmentId, [FromBody] SubmitAssessmentRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("POST /api/assessments/{AssessmentId}/submit called by user {UserId}", assessmentId, userId);

        var result = await _assessmentService.SubmitAssessmentAsync(userId, assessmentId, request);
        if (result == null)
            return BadRequest(new { error = "Unable to submit assessment" });

        return Ok(result);
    }
}
