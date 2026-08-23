using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Learner")]
public class NotesController : ControllerBase
{
    private readonly INotesService _notesService;
    private readonly ILogger<NotesController> _logger;

    public NotesController(
        INotesService notesService,
        ILogger<NotesController> logger)
    {
        _notesService = notesService;
        _logger = logger;
    }

    private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet("courses/{courseId}")]
    public async Task<ActionResult<CourseNotesResponse>> GetCourseNotes(int courseId)
    {
        _logger.LogInformation("HTTP GET /api/notes/courses/{CourseId} called by user {UserId}", courseId, UserId);

        var result = await _notesService.GetCourseNotesAsync(UserId, courseId);
        if (result == null)
            return NotFound(new { error = "Course not found or not enrolled" });

        return Ok(result);
    }

    [HttpGet("lessons/{lessonId}")]
    public async Task<ActionResult<LearnerNoteDto>> GetLessonNote(int lessonId)
    {
        _logger.LogInformation("HTTP GET /api/notes/lessons/{LessonId} called by user {UserId}", lessonId, UserId);

        var result = await _notesService.GetLessonNoteAsync(UserId, lessonId);
        if (result == null)
            return NotFound(new { error = "Lesson not found or not enrolled" });

        return Ok(result);
    }

    [HttpPut("lessons/{lessonId}")]
    public async Task<ActionResult<LearnerNoteDto>> UpsertLessonNote(int lessonId, [FromBody] UpsertNoteRequest request)
    {
        _logger.LogInformation("HTTP PUT /api/notes/lessons/{LessonId} called by user {UserId}", lessonId, UserId);

        var result = await _notesService.UpsertLessonNoteAsync(UserId, lessonId, request.Content);
        if (result == null)
            return NotFound(new { error = "Lesson not found or not enrolled" });

        return Ok(result);
    }

    [HttpDelete("lessons/{lessonId}")]
    public async Task<IActionResult> DeleteLessonNote(int lessonId)
    {
        _logger.LogInformation("HTTP DELETE /api/notes/lessons/{LessonId} called by user {UserId}", lessonId, UserId);

        var deleted = await _notesService.DeleteLessonNoteAsync(UserId, lessonId);
        if (!deleted)
            return NotFound(new { error = "Lesson not found" });

        return NoContent();
    }
}