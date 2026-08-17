using CebuUpskilling.Backend.Data;
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
            .ToListAsync();

        _logger.LogInformation("Returning {Count} learners", learners.Count);
        return Ok(learners);
    }
}
