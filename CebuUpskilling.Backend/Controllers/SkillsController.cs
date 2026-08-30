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
    private readonly IJobseekerSkillParserAgent _jobseekerSkillParserAgent;
    private readonly ILearnerRepository _learners;
    private readonly ILearnerSkillRepository _learnerSkills;
    private readonly ISkillRepository _skills;
    private readonly ILogger<SkillsController> _logger;

    public SkillsController(
        IJobseekerSkillParserAgent jobseekerSkillParserAgent,
        ILearnerRepository learners,
        ILearnerSkillRepository learnerSkills,
        ISkillRepository skills,
        ILogger<SkillsController> logger)
    {
        _jobseekerSkillParserAgent = jobseekerSkillParserAgent;
        _learners = learners;
        _learnerSkills = learnerSkills;
        _skills = skills;
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

        if (string.IsNullOrWhiteSpace(request?.ResumeText))
        {
            _logger.LogInformation("Empty resume text for user {UserId}; returning empty skills", userId);
            return Ok(new ParseSkillsResult(new List<ParsedSkillResult>()));
        }

        var result = await _jobseekerSkillParserAgent.ParseAndCreateAssessmentsAsync(userId, request.ResumeText, ct);

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

public record LearnerSkillDto(int SkillId, string Name, string? Category, int CurrentLevel, bool Verified);
