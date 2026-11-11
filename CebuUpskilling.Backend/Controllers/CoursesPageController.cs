using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CoursesPageController : ControllerBase
{
    private readonly ICoursesPageService _coursesPageService;
    private readonly ILogger<CoursesPageController> _logger;

    public CoursesPageController(ICoursesPageService coursesPageService, ILogger<CoursesPageController> logger)
    {
        _coursesPageService = coursesPageService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<CoursesPageResponse>> GetCoursesPage([FromQuery] string? category = null)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP GET /api/coursespage called by user {UserId}", userId);

        var result = await _coursesPageService.GetCoursesPageAsync(userId, category);
        if (result == null)
            return BadRequest(new { error = "No learner profile found" });

        return Ok(result);
    }
}
