using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Repositories;
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
    private readonly ILearnerRepository _learners;
    private readonly ILessonRepository _lessons;
    private readonly ILearnerStudyCourseRepository _learnerStudyCourses;
    private readonly ILogger<MediaController> _logger;

    public MediaController(
        IMediaService mediaService,
        ILearnerRepository learners,
        ILessonRepository lessons,
        ILearnerStudyCourseRepository learnerStudyCourses,
        ILogger<MediaController> logger)
    {
        _mediaService = mediaService;
        _learners = learners;
        _lessons = lessons;
        _learnerStudyCourses = learnerStudyCourses;
        _logger = logger;
    }

    [HttpPost("lessons/{lessonId}/video")]
    [RequestSizeLimit(524_288_000)]
    public async Task<ActionResult<MediaDto>> UploadLessonVideo(int lessonId, IFormFile file)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP POST /api/media/lessons/{LessonId}/video called by user {UserId}", lessonId, userId);

        if (!await CanEnrolledLearnerAccessLessonAsync(userId, lessonId))
        {
            _logger.LogWarning("Video upload rejected: user {UserId} is not enrolled in lesson {LessonId}", userId, lessonId);
            return NotFound(new { error = "Lesson not found or not enrolled" });
        }

        if (file is null || file.Length == 0)
        {
            _logger.LogWarning("Video upload rejected: no file provided for lesson {LessonId} by user {UserId}", lessonId, userId);
            return BadRequest(new { error = "A video file must be provided" });
        }

        if (!IsVideoContentType(file.ContentType))
        {
            _logger.LogWarning("Video upload rejected: content type {ContentType} is not allowed for lesson {LessonId} by user {UserId}", file.ContentType, lessonId, userId);
            return BadRequest(new { error = "Only video files are allowed" });
        }

        _logger.LogInformation("Uploading video for lesson {LessonId}: {FileName} ({FileSize} bytes)", lessonId, file.Name, file.Length);

        var result = await _mediaService.UploadLessonVideoAsync(lessonId, file);
        _logger.LogInformation("Video upload completed for lesson {LessonId}: {MediaId}", lessonId, result.MediaId);

        return CreatedAtAction(nameof(UploadLessonVideo), new { lessonId }, result);
    }

    public async Task<bool> CanEnrolledLearnerAccessLessonAsync(int userId, int lessonId)
    {
        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
            return false;

        var lesson = await _lessons.GetByIdAsync(lessonId);
        if (lesson == null)
            return false;

        var enrollment = await _learnerStudyCourses.GetByLearnerAndCourseAsync(learner.LearnerId, lesson.CourseId);
        return enrollment != null;
    }

    private static bool IsVideoContentType(string? contentType) =>
        !string.IsNullOrWhiteSpace(contentType)
        && contentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase);
}
