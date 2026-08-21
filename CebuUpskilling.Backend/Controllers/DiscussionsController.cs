using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Learner")]
public class DiscussionsController : ControllerBase
{
    private readonly IDiscussionService _discussionService;
    private readonly ILogger<DiscussionsController> _logger;

    public DiscussionsController(
        IDiscussionService discussionService,
        ILogger<DiscussionsController> logger)
    {
        _discussionService = discussionService;
        _logger = logger;
    }

    private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet("lessons/{lessonId}")]
    public async Task<ActionResult<LessonDiscussionResponse>> GetLessonDiscussion(int lessonId)
    {
        _logger.LogInformation("HTTP GET /api/discussions/lessons/{LessonId} called by user {UserId}", lessonId, UserId);

        var result = await _discussionService.GetLessonDiscussionAsync(UserId, lessonId);
        if (result == null)
            return NotFound(new { error = "Lesson not found or not enrolled" });

        return Ok(result);
    }

    [HttpPost("lessons/{lessonId}/posts")]
    public async Task<ActionResult<DiscussionPostDto>> CreatePost(int lessonId, [FromBody] CreateDiscussionPostRequest request)
    {
        _logger.LogInformation("HTTP POST /api/discussions/lessons/{LessonId}/posts called by user {UserId}", lessonId, UserId);

        var result = await _discussionService.CreatePostAsync(UserId, lessonId, request.Content);
        if (result == null)
            return NotFound(new { error = "Lesson not found or not enrolled" });

        return Ok(result);
    }
}