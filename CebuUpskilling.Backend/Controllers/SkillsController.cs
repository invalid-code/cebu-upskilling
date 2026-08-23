using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SkillsController : ControllerBase
{
    private readonly IJobseekerSkillParserAgent _jobseekerSkillParserAgent;
    private readonly ILogger<SkillsController> _logger;

    public SkillsController(IJobseekerSkillParserAgent jobseekerSkillParserAgent, ILogger<SkillsController> logger)
    {
        _jobseekerSkillParserAgent = jobseekerSkillParserAgent;
        _logger = logger;
    }

    [HttpPost("parse")]
    public async Task<ActionResult<ParseSkillsResult>> ParseSkills(
        [FromBody] ParseSkillsRequest request,
        CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP POST /api/skills/parse called by user {UserId}", userId);

        var result = await _jobseekerSkillParserAgent.ParseAndCreateAssessmentsAsync(userId, request.ResumeText ?? string.Empty, ct);

        _logger.LogInformation("Skill parsing completed for user {UserId}: {SkillCount} skills found, {AssessmentCount} assessments created",
            userId, result.Skills.Count, result.Skills.Count(s => s.AssessmentId != null));

        return Ok(result);
    }
}

public record ParseSkillsRequest(string? ResumeText);
