using System.Security.Claims;
using CebuUpskilling.Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StatsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<StatsController> _logger;

    public StatsController(ApplicationDbContext context, ILogger<StatsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet("week")]
    public async Task<IActionResult> GetWeeklyStats()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("GET /api/stats/week called by user {UserId}", userId);

        var learner = await _context.Learners.FirstOrDefaultAsync(l => l.UserId == userId);
        if (learner == null)
        {
            return Ok(new
            {
                learningTimeHours = 0,
                coursesActive = 0,
                jobsWorthApplying = 0,
            });
        }

        var coursesActive = await _context.LearnerStudyCourses
            .Where(lsc => lsc.LearnerId == learner.LearnerId)
            .CountAsync();

        var learningTimeHours = await _context.LearnerStudyCourses
            .Where(lsc => lsc.LearnerId == learner.LearnerId)
            .SumAsync(lsc => lsc.LastTotalProgressPercent * 0.1);

        var jobsWorthApplying = await _context.Posts.CountAsync();

        return Ok(new
        {
            learningTimeHours = Math.Round(learningTimeHours, 1),
            coursesActive,
            jobsWorthApplying,
        });
    }
}
