using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CourseContentController : ControllerBase
{
    private readonly ICourseContentService _courseContentService;
    private readonly ILogger<CourseContentController> _logger;

    public CourseContentController(
        ICourseContentService courseContentService,
        ILogger<CourseContentController> logger)
    {
        _courseContentService = courseContentService;
        _logger = logger;
    }

    [HttpGet("courses/{courseId}/content")]
    public async Task<ActionResult<CourseContentResponse>> GetCourseContent(
        int courseId,
        [FromQuery] int? lessonId = null)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP GET /api/coursecontent/courses/{CourseId}/content called by user {UserId}", courseId, userId);

        var result = await _courseContentService.GetCourseContentAsync(userId, courseId, lessonId);
        if (result == null)
            return NotFound(new { error = "Course not found or not enrolled" });

        return Ok(result);
    }

    [HttpGet("lessons/{lessonId}")]
    public async Task<ActionResult<LessonDetailDto>> GetLessonDetail(int lessonId)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP GET /api/coursecontent/lessons/{LessonId} called by user {UserId}", lessonId, userId);

        var result = await _courseContentService.GetLessonDetailAsync(userId, lessonId);
        if (result == null)
            return NotFound(new { error = "Lesson not found" });

        return Ok(result);
    }

    [HttpPut("lessons/{lessonId}/progress")]
    public async Task<ActionResult<LessonProgressDto>> UpdateLessonProgress(
        int lessonId,
        [FromBody] UpdateLessonProgressRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP PUT /api/coursecontent/lessons/{LessonId}/progress called by user {UserId}", lessonId, userId);

        var result = await _courseContentService.UpdateLessonProgressAsync(userId, lessonId, request.ProgressPercent);
        if (result == null)
            return NotFound(new { error = "Lesson or enrollment not found" });

        return Ok(result);
    }
}
