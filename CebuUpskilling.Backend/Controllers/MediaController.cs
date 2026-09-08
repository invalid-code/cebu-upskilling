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
    private readonly IAppUserRepository _users;
    private readonly ILogger<MediaController> _logger;

    public MediaController(
        IMediaService mediaService,
        ILearnerRepository learners,
        ILessonRepository lessons,
        ILearnerStudyCourseRepository learnerStudyCourses,
        IAppUserRepository users,
        ILogger<MediaController> logger)
    {
        _mediaService = mediaService;
        _learners = learners;
        _lessons = lessons;
        _learnerStudyCourses = learnerStudyCourses;
        _users = users;
        _logger = logger;
    }

    [HttpPost("lessons/{lessonId}/video")]
    [RequestSizeLimit(524_288_000)]
    public async Task<ActionResult<MediaDto>> UploadLessonVideo(int lessonId, IFormFile file)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP POST /api/media/lessons/{LessonId}/video called by user {UserId}", lessonId, userId);

        if (!await CanUploadToLessonAsync(userId, lessonId))
        {
            _logger.LogWarning("Video upload rejected: user {UserId} cannot access lesson {LessonId}", userId, lessonId);
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

    [HttpPost("documents")]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<DocumentUploadDto>> UploadDocument(IFormFile file)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("POST /api/media/documents called by user {UserId}", userId);

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

    /// <summary>
    /// Attaches a downloadable document (PDF, Word, text, image) to a lesson.
    /// Unlike <see cref="UploadDocument"/> the file is persisted as a
    /// <c>Media</c> row on the lesson, so learners see it in the lesson
    /// resources sidebar with download links.
    /// </summary>
    [HttpPost("lessons/{lessonId}/documents")]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<MediaDto>> UploadLessonDocument(int lessonId, IFormFile file)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP POST /api/media/lessons/{LessonId}/documents called by user {UserId}", lessonId, userId);

        if (!await CanUploadToLessonAsync(userId, lessonId))
        {
            _logger.LogWarning("Document upload rejected: user {UserId} cannot access lesson {LessonId}", userId, lessonId);
            return NotFound(new { error = "Lesson not found or not enrolled" });
        }

        if (file is null || file.Length == 0)
        {
            _logger.LogWarning("Document upload rejected: no file provided for lesson {LessonId} by user {UserId}", lessonId, userId);
            return BadRequest(new { error = "A file must be provided" });
        }

        try
        {
            var result = await _mediaService.UploadLessonDocumentAsync(lessonId, file);
            _logger.LogInformation("Document upload completed for lesson {LessonId}: {MediaId}", lessonId, result.MediaId);
            return CreatedAtAction(nameof(UploadLessonDocument), new { lessonId }, result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Document upload rejected for lesson {LessonId}: {Reason}", lessonId, ex.Message);
            return BadRequest(new { error = ex.Message });
        }
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

    /// <summary>
    /// Upload access: an enrolled learner (existing behavior) or the course
    /// owner — the recruiter of the owning company, or the provider who
    /// created the course. Owners were previously locked out of attaching
    /// lesson content entirely.
    /// </summary>
    public async Task<bool> CanUploadToLessonAsync(int userId, int lessonId)
    {
        if (await CanEnrolledLearnerAccessLessonAsync(userId, lessonId))
            return true;

        var lesson = await _lessons.GetByIdAsync(lessonId);
        if (lesson?.Course == null)
            return false;

        var user = await _users.GetByIdAsync(userId);
        if (user == null)
            return false;

        if (user.Role == "CourseProvider" && lesson.Course.CreatedBy == userId.ToString())
            return true;

        if (user.Role == "Recruiter" && user.CompanyId != null && user.CompanyId == lesson.Course.CompanyId)
            return true;

        return false;
    }

    private static bool IsVideoContentType(string? contentType) =>
        !string.IsNullOrWhiteSpace(contentType)
        && contentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase);
}