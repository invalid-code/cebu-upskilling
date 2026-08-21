using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SkillsController : ControllerBase
{
    private readonly ISkillParsingService _skillParsingService;
    private readonly ISkillRepository _skills;
    private readonly ILogger<SkillsController> _logger;

    public SkillsController(
        ISkillParsingService skillParsingService,
        ISkillRepository skills,
        ILogger<SkillsController> logger)
    {
        _skillParsingService = skillParsingService;
        _skills = skills;
        _logger = logger;
    }

    [HttpPost("parse")]
    public async Task<ActionResult<ParseSkillsResult>> ParseSkills(
        [FromBody] ParseSkillsRequest request,
        CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP POST /api/skills/parse called by user {UserId}", userId);

        if (string.IsNullOrWhiteSpace(request.ResumeText))
        {
            return BadRequest(new { error = "ResumeText is required" });
        }

        var result = await _skillParsingService.ParseAndCreateAssessmentsAsync(userId, request.ResumeText, ct);

        _logger.LogInformation("Skill parsing completed for user {UserId}: {SkillCount} skills found, {AssessmentCount} assessments created",
            userId, result.Skills.Count, result.Skills.Count(s => s.AssessmentId != null));

        return Ok(result);
    }

    [HttpGet("list")]
    public async Task<ActionResult<List<Skill>>> ListSkills()
    {
        _logger.LogInformation("HTTP GET /api/skills/list called");

        var skills = await _skills.ListAllAsync();

        _logger.LogInformation("HTTP GET /api/skills/list returned {Count} skills", skills.Count);
        return Ok(skills);
    }
}

public record ParseSkillsRequest(string? ResumeText);
