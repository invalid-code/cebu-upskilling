using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MediaController : ControllerBase
{
    private readonly IMediaService _mediaService;
    private readonly ILogger<MediaController> _logger;

    public MediaController(IMediaService mediaService, ILogger<MediaController> logger)
    {
        _mediaService = mediaService;
        _logger = logger;
    }

    [HttpPost("lessons/{lessonId}/video")]
    [RequestSizeLimit(524_288_000)]
    public async Task<ActionResult<MediaDto>> UploadLessonVideo(int lessonId, IFormFile file)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP POST /api/media/lessons/{LessonId}/video called by user {UserId}", lessonId, userId);

        if (file is null || file.Length == 0)
        {
            _logger.LogWarning("Video upload rejected: no file provided for lesson {LessonId} by user {UserId}", lessonId, userId);
            return BadRequest(new { error = "A video file must be provided" });
        }

        _logger.LogInformation("Uploading video for lesson {LessonId}: {FileName} ({FileSize} bytes)", lessonId, file.Name, file.Length);

        var result = await _mediaService.UploadLessonVideoAsync(lessonId, file);
        _logger.LogInformation("Video upload completed for lesson {LessonId}: {MediaId}", lessonId, result.MediaId);

        return CreatedAtAction(nameof(UploadLessonVideo), new { lessonId }, result);
    }

    [HttpPost("documents")]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<DocumentUploadDto>> UploadDocument(IFormFile file)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP POST /api/media/documents called by user {UserId}", userId);

        if (file is null || file.Length == 0)
        {
            _logger.LogWarning("Document upload rejected: no file provided by user {UserId}", userId);
            return BadRequest(new { error = "A file must be provided" });
        }

        try
        {
            var result = await _mediaService.UploadDocumentAsync(file);
            _logger.LogInformation("Document upload completed for user {UserId}: {FileName}", userId, result.FileName);
            return StatusCode(201, result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Document upload rejected for user {UserId}: {Reason}", userId, ex.Message);
            return BadRequest(new { error = ex.Message });
        }
    }
}
