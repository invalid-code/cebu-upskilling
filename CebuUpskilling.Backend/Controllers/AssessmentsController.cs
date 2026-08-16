using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Learner")]
public class AssessmentsController : ControllerBase
{
    private readonly IAssessmentService _assessmentService;
    private readonly ILogger<AssessmentsController> _logger;

    public AssessmentsController(IAssessmentService assessmentService, ILogger<AssessmentsController> logger)
    {
        _assessmentService = assessmentService;
        _logger = logger;
    }

    [HttpGet("results")]
    public async Task<ActionResult<List<AssessmentResultResponse>>> GetRecentResults()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("GET /api/assessments/results called by user {UserId}", userId);

        var results = await _assessmentService.GetRecentResultsAsync(userId);
        return Ok(results);
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
}
