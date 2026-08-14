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

    public LearnersController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var learners = await _context.Learners
            .Include(l => l.User)
            .ToListAsync();

        return Ok(learners);
    }
}
