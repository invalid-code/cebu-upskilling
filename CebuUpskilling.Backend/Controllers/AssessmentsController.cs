using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class AssessmentsController : BaseEntityController<LearnerAssessment>
{
    private readonly IJobseekerSkillParserAgent _jobseekerSkillParserAgent;

    public AssessmentsController(
        IEntityService<LearnerAssessment> service,
        IJobseekerSkillParserAgent jobseekerSkillParserAgent,
        ILogger<AssessmentsController> logger)
        : base(service, logger, "Assessments")
    {
        _jobseekerSkillParserAgent = jobseekerSkillParserAgent;
    }

    protected override Guid GetId(LearnerAssessment entity) => entity.LearnerAssessmentId;

    // Assessment records are read/written exclusively through the learner-scoped
    // endpoints below (which resolve the learner from claims). The generic CRUD
    // inherited from BaseEntityController<LearnerAssessment> would let any
    // authenticated user dump every learner's results (GetAll), or forge/rewrite
    // Verified and ScoredLevel on another learner's skill record.
    [HttpGet]
    public override Task<ActionResult<List<LearnerAssessment>>> GetAll() =>
        Task.FromResult<ActionResult<List<LearnerAssessment>>>(NotFound());

    [HttpGet("{id}")]
    public override Task<ActionResult<LearnerAssessment>> GetById(Guid id) =>
        Task.FromResult<ActionResult<LearnerAssessment>>(NotFound());

    [HttpPost]
    public override Task<ActionResult<LearnerAssessment>> Create(LearnerAssessment entity) =>
        Task.FromResult<ActionResult<LearnerAssessment>>(NotFound());

    [HttpPut("{id}")]
    public override Task<ActionResult<LearnerAssessment>> Update(Guid id, LearnerAssessment entity) =>
        Task.FromResult<ActionResult<LearnerAssessment>>(NotFound());

    [HttpDelete("{id}")]
    public override Task<IActionResult> Delete(Guid id) =>
        Task.FromResult<IActionResult>(NotFound());

    [Authorize(Roles = "Learner")]
    [HttpGet("results")]
    public async Task<ActionResult<List<AssessmentResultResponse>>> GetRecentResults()
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP GET /api/assessments/results called by user {UserId}", userId);

        var results = await _jobseekerSkillParserAgent.GetRecentResultsAsync(userId);
        return Ok(results);
    }

    [Authorize(Roles = "Learner")]
    [HttpGet("available")]
    public async Task<ActionResult<AvailableAssessmentsResponse>> GetAvailableAssessments()
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP GET /api/assessments/available called by user {UserId}", userId);

        var result = await _jobseekerSkillParserAgent.GetAvailableAssessmentsAsync(userId);
        if (result == null)
            return Ok(null);

        return Ok(result);
    }

    [Authorize(Roles = "Learner")]
    [HttpGet("recommended")]
    public async Task<ActionResult<RecommendedAssessmentResponse>> GetRecommended()
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP GET /api/assessments/recommended called by user {UserId}", userId);

        var result = await _jobseekerSkillParserAgent.GetRecommendedAsync(userId);
        if (result == null)
            return Ok(null);

        return Ok(result);
    }

    [Authorize(Roles = "Learner")]
    [HttpPost("start")]
    public async Task<ActionResult<StartAssessmentResponse>> StartAssessment([FromBody] StartAssessmentRequest request)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP POST /api/assessments/start called by user {UserId} for skill {SkillId}", userId, request.SkillId);

        var result = await _jobseekerSkillParserAgent.StartAssessmentAsync(userId, request);
        if (result == null)
            return BadRequest(new { error = "Unable to start assessment" });

        return Ok(result);
    }

    [Authorize(Roles = "Learner")]
    [HttpGet("{assessmentId}/questions")]
    public async Task<ActionResult<AssessmentQuestionsResponse>> GetQuestions(Guid assessmentId)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP GET /api/assessments/{AssessmentId}/questions called by user {UserId}", assessmentId, userId);

        var result = await _jobseekerSkillParserAgent.GetQuestionsAsync(userId, assessmentId);
        if (result == null)
            return NotFound(new { error = "Assessment not found" });

        return Ok(result);
    }

    [Authorize(Roles = "Learner")]
    [HttpPost("{assessmentId}/submit")]
    public async Task<ActionResult<SubmitAssessmentResponse>> SubmitAssessment(Guid assessmentId, [FromBody] SubmitAssessmentRequest request)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP POST /api/assessments/{AssessmentId}/submit called by user {UserId}", assessmentId, userId);

        var result = await _jobseekerSkillParserAgent.SubmitAssessmentAsync(userId, assessmentId, request);
        if (result == null)
            return BadRequest(new { error = "Unable to submit assessment" });

        return Ok(result);
    }

    [Authorize(Roles = "Learner")]
    [HttpPost("{assessmentId}/integrity-event")]
    public IActionResult LogIntegrityEvent(Guid assessmentId, [FromBody] LogIntegrityEventRequest request)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogWarning(
            "Assessment integrity event: user {UserId} left assessment {AssessmentId} tab (event={EventType}, detail={Detail}) at {OccurredAt}",
            userId, assessmentId, request.EventType, request.Detail, DateTime.UtcNow);

        return Ok(new { recorded = true });
    }

    [Authorize(Roles = "Recruiter")]
    [HttpPost("company/questions")]
    public async Task<ActionResult<CreatedCompanyQuestionResponse>> CreateCompanyQuestion([FromBody] CreateCompanyQuestionRequest request)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP POST /api/assessments/company/questions called by user {UserId} for skill {SkillId}", userId, request.SkillId);

        var result = await _jobseekerSkillParserAgent.CreateCompanyQuestionAsync(userId, request);
        if (result == null)
            return BadRequest(new { error = "Unable to create company question" });

        return Ok(result);
    }

    [Authorize(Roles = "CourseProvider")]
    [HttpPost("provider/questions")]
    public async Task<ActionResult<CreatedProviderQuestionResponse>> CreateProviderQuestion([FromBody] CreateProviderQuestionRequest request)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP POST /api/assessments/provider/questions called by user {UserId} for skill {SkillId}", userId, request.SkillId);

        var result = await _jobseekerSkillParserAgent.CreateProviderQuestionAsync(userId, request);
        if (result == null)
            return BadRequest(new { error = "Unable to create assessment question" });

        return Ok(result);
    }
}
