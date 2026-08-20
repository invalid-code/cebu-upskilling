using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/learners")]
[Authorize(Roles = "Learner")]
public class LearnersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<LearnersController> _logger;

    public LearnersController(ApplicationDbContext context, ILogger<LearnersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        _logger.LogInformation("HTTP GET /api/learners requested");
        var learners = await _context.Learners
            .Include(l => l.User)
            .OrderBy(l => l.User.LastName)
            .ThenBy(l => l.User.FirstName)
            .ToListAsync();

        // Only expose a non-sensitive projection: emails, birthdays, addresses and
        // auth token hashes must never leave this endpoint.
        var summaries = learners.Select(l => new LearnerSummaryDto(
            l.LearnerId,
            l.IsPremium,
            new LearnerUserSummaryDto(
                l.User.UserId,
                l.User.FirstName,
                l.User.LastName,
                l.User.MiddleName,
                l.User.Role,
                l.User.TargetRole,
                l.User.RemoteFriendly
            ))).ToList();

        _logger.LogInformation("Returning {Count} learners", summaries.Count);
        return Ok(summaries);
    }
}
