using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
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
    private readonly ILearnerRepository _learners;
    private readonly ILearnerSkillRepository _learnerSkills;
    private readonly ILogger<SkillsController> _logger;

    public SkillsController(
        ISkillParsingService skillParsingService,
        ILearnerRepository learners,
        ILearnerSkillRepository learnerSkills,
        ILogger<SkillsController> logger)
    {
        _skillParsingService = skillParsingService;
        _learners = learners;
        _learnerSkills = learnerSkills;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LearnerSkillDto>>> GetMySkills()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP GET /api/skills called by user {UserId}", userId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null) return Ok(Array.Empty<LearnerSkillDto>());

        var learnerSkills = await _learnerSkills.GetByLearnerIdWithSkillAsync(learner.LearnerId);
        var result = learnerSkills.Select(ls => new LearnerSkillDto(
            ls.SkillId,
            ls.Skill.Name,
            ls.Skill.Category,
            ls.CurrentLevel,
            ls.Verified
        )).ToList();

        return Ok(result);
    }

    [HttpPost("parse")]
    public async Task<ActionResult<ParseSkillsResult>> ParseSkills(
        [FromBody] ParseSkillsRequest request,
        CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP POST /api/skills/parse called by user {UserId}", userId);

        var result = await _skillParsingService.ParseAndCreateAssessmentsAsync(userId, request.ResumeText ?? string.Empty, ct);

        _logger.LogInformation("Skill parsing completed for user {UserId}: {SkillCount} skills found, {AssessmentCount} assessments created",
            userId, result.Skills.Count, result.Skills.Count(s => s.AssessmentId != null));

        return Ok(result);
    }
}

public record ParseSkillsRequest(string? ResumeText);

public record LearnerSkillDto(int SkillId, string Name, string? Category, int CurrentLevel, bool Verified);
