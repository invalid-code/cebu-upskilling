using System.Security.Claims;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
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
    [Authorize(Roles = "Learner")]
    public async Task<IActionResult> GetWeeklyStats()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP GET /api/stats/week called by user {UserId}", userId);

        var learner = await _context.Learners.FirstOrDefaultAsync(l => l.UserId == userId);
        if (learner == null)
        {
            _logger.LogWarning("No learner profile found for user {UserId} when requesting weekly stats", userId);
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

        _logger.LogInformation("Weekly stats for user {UserId}: {LearningTimeHours}h, {CoursesActive} courses, {JobsWorthApplying} jobs",
            userId, Math.Round(learningTimeHours, 1), coursesActive, jobsWorthApplying);

        return Ok(new
        {
            learningTimeHours = Math.Round(learningTimeHours, 1),
            coursesActive,
            jobsWorthApplying,
        });
    }

    [HttpGet("business")]
    [Authorize(Roles = "Recruiter")]
    public async Task<IActionResult> GetBusinessStats()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("GET /api/stats/business called by user {UserId}", userId);

        var recruiter = await _context.Recruiters
            .Include(r => r.Company)
            .FirstOrDefaultAsync(r => r.UserId == userId);

        if (recruiter == null)
        {
            _logger.LogWarning("Recruiter {UserId} has no company association", userId);
            return BadRequest(new { error = "No company associated with this account" });
        }

        var company = new CompanySummary(
            recruiter.CompanyId,
            recruiter.RecruiterId,
            recruiter.Company.Name,
            await _context.Posts.CountAsync(p => p.CompanyId == recruiter.CompanyId),
            await _context.Recruiters.CountAsync(r => r.CompanyId == recruiter.CompanyId));

        var trackedSkillSummary = await _context.LearnerSkills
            .Where(ls => ls.CurrentLevel > 0)
            .GroupBy(ls => 1)
            .Select(g => new
            {
                Count = g.Count(),
                Average = g.Average(ls => (double)ls.CurrentLevel),
            })
            .SingleOrDefaultAsync();
        var talentPool = new TalentPoolSummary(
            await _context.Learners.CountAsync(),
            trackedSkillSummary?.Count ?? 0,
            trackedSkillSummary is { Count: > 0 }
                ? Math.Round(trackedSkillSummary.Average, 1)
                : 0);

        // Single projection query: no Include chains, no client-side re-navigation.
        var jobPostings = await _context.Posts
            .Where(p => p.CompanyId == recruiter.CompanyId)
            .OrderByDescending(p => p.PostId)
            .Select(p => new JobPostingDto(
                p.PostId,
                p.Title,
                p.Description,
                string.IsNullOrWhiteSpace(p.Schedule) ? "Full-time" : p.Schedule,
                p.PostCourseRequireds.Select(pcr => new RequiredCourseDto(
                    pcr.CourseId,
                    pcr.Course.Name,
                    pcr.Course.Genre.SubDiscipline.Discipline.Name,
                    pcr.Course.TechnicalLevel,
                    pcr.Course.Mode)).ToList(),
                p.PostSkills.Select(ps => new RequiredSkillDto(
                    ps.SkillId,
                    ps.Skill.Name,
                    ps.Skill.Category,
                    ps.RequiredLevel)).ToList()))
            .ToListAsync();

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
