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
        _logger.LogInformation("POST /api/Media/lessons/{LessonId}/video called", lessonId);

        if (file is null || file.Length == 0)
            return BadRequest(new { error = "A video file must be provided" });

        var result = await _mediaService.UploadLessonVideoAsync(lessonId, file);
        return CreatedAtAction(nameof(UploadLessonVideo), new { lessonId }, result);
    }
}
