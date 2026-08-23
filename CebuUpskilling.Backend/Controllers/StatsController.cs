using System.Security.Claims;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
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
    private readonly IStatsService _statsService;
    private readonly ILogger<StatsController> _logger;

    public StatsController(ApplicationDbContext context, IStatsService statsService, ILogger<StatsController> logger)
    {
        _context = context;
        _statsService = statsService;
        _logger = logger;
    }

    [HttpGet("week")]
    [Authorize(Roles = "Learner")]
    public async Task<IActionResult> GetWeeklyStats()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP GET /api/stats/week called by user {UserId}", userId);

        var stats = await _statsService.GetWeeklyStatsAsync(userId);

        return Ok(new
        {
            learningTimeHours = stats.LearningTimeHours,
            coursesActive = stats.CoursesActive,
            jobsWorthApplying = stats.JobsWorthApplying,
        });
    }

    [HttpGet("business")]
    [Authorize(Roles = "Recruiter")]
    public async Task<IActionResult> GetBusinessStats()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("GET /api/stats/business called by user {UserId}", userId);

        var user = await _context.Users
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user?.Company == null)
        {
            _logger.LogWarning("Recruiter {UserId} has no company association", userId);
            return BadRequest(new { error = "No company associated with this account" });
        }

        var companyId = user.CompanyId!.Value;

        var company = new CompanySummary(
            user.Company.Name,
            await _context.Posts.CountAsync(p => p.CompanyId == companyId),
            await _context.Users.CountAsync(u => u.CompanyId == companyId && u.Role == "Recruiter"));

        var trackedSkills = await _context.LearnerSkills
            .Where(ls => ls.CurrentLevel > 0)
            .ToListAsync();
        var talentPool = new TalentPoolSummary(
            await _context.Learners.CountAsync(),
            trackedSkills.Count,
            trackedSkills.Count > 0 ? Math.Round(trackedSkills.Average(ls => (double)ls.CurrentLevel), 1) : 0);

        var posts = await _context.Posts
            .Where(p => p.CompanyId == companyId)
            .OrderByDescending(p => p.PostId)
            .ToListAsync();

        var jobPostings = posts.Select(p => new JobPostingDto(
            p.PostId,
            p.Title,
            p.Description,
            p.Location,
            p.SalaryRange,
            p.JobType,
            p.ExperienceLevel,
            p.IsRemote,
            p.IsActive,
            p.CreatedAt)).ToList();

        var demand = await _context.RoleSkills
            .Include(rs => rs.Skill)
            .GroupBy(rs => new { rs.SkillId, rs.Skill.Name, rs.Skill.Category })
            .Select(g => new
            {
                g.Key.SkillId,
                g.Key.Name,
                g.Key.Category,
                RequiredForRoles = g.Count(),
                AvgRequiredLevel = Math.Round(g.Average(rs => (double)rs.RequiredLevel), 1),
            })
            .OrderByDescending(x => x.RequiredForRoles)
            .ThenBy(x => x.Name)
            .ToListAsync();

        var supply = await _context.LearnerSkills
            .Where(ls => ls.CurrentLevel > 0)
            .GroupBy(ls => ls.SkillId)
            .ToDictionaryAsync(
                g => g.Key,
                g => new { Count = g.Count(), Avg = Math.Round(g.Average(ls => (double)ls.CurrentLevel), 1) });

        var skillDemand = demand.Select(d =>
        {
            supply.TryGetValue(d.SkillId, out var skillSupply);
            return new SkillDemandDto(d.Name, d.Category, d.RequiredForRoles, d.AvgRequiredLevel,
                skillSupply?.Count ?? 0, skillSupply?.Avg);
        }).ToList();

        return Ok(new BusinessStatsResponse(company, talentPool, jobPostings, skillDemand));
    }
}
