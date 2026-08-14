using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Learner")]
public class SkillGapsController : ControllerBase
{
    private readonly ISkillGapService _skillGapService;
    private readonly ILogger<SkillGapsController> _logger;

    public SkillGapsController(ISkillGapService skillGapService, ILogger<SkillGapsController> logger)
    {
        _skillGapService = skillGapService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<SkillGapResponse>>> GetMySkillGaps()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP GET /api/skillgaps called by user {UserId}", userId);

        var gaps = await _skillGapService.GetSkillGapsAsync(userId);
        return Ok(gaps);
    }
}
