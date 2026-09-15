using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/pathways")]
[Authorize(Roles = "Learner")]
public class LearningPathwaysController : ControllerBase
{
    private readonly ILearningPathwayAgent _pathwayAgent;
    private readonly ILogger<LearningPathwaysController> _logger;

    public LearningPathwaysController(ILearningPathwayAgent pathwayAgent, ILogger<LearningPathwaysController> logger)
    {
        _pathwayAgent = pathwayAgent;
        _logger = logger;
    }

    /// <summary>
    /// Ordered learning pathway for the current learner, built from their skill
    /// gaps, live job-market demand, and the courses that teach each skill.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<LearningPathwayResponse>> GetMyPathway()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP GET /api/pathways called by user {UserId}", userId);

        var pathway = await _pathwayAgent.GenerateAsync(userId);
        if (pathway == null)
            return Ok(null);

        return Ok(pathway);
    }
}
