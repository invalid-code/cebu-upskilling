using System.Security.Claims;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StatsController : ControllerBase
{
    private readonly IStatsService _statsService;
    private readonly ILogger<StatsController> _logger;

    public StatsController(IStatsService statsService, ILogger<StatsController> logger)
    {
        _statsService = statsService;
        _logger = logger;
    }

    [HttpGet("week")]
    public async Task<IActionResult> GetWeeklyStats()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("GET /api/stats/week called by user {UserId}", userId);

        var stats = await _statsService.GetWeeklyStatsAsync(userId);

        return Ok(stats);
    }
}