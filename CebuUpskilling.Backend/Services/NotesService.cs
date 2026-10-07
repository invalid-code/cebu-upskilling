using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

public interface INotesService
{
    Task<CourseNotesResponse?> GetCourseNotesAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default);
    Task<LearnerNoteDto?> GetLessonNoteAsync(Guid userId, Guid lessonId, CancellationToken cancellationToken = default);
    Task<LearnerNoteDto?> UpsertLessonNoteAsync(Guid userId, Guid lessonId, string content, CancellationToken cancellationToken = default);
    Task<bool> DeleteLessonNoteAsync(Guid userId, Guid lessonId, CancellationToken cancellationToken = default);
}

public class NotesService : INotesService
{
    private readonly ILearnerRepository _learners;
    private readonly ILessonRepository _lessons;
    private readonly ILearnerStudyCourseRepository _learnerStudyCourses;
    private readonly ILearnerNoteRepository _notes;
    private readonly ILogger<NotesService> _logger;

    public NotesService(
        ILearnerRepository learners,
        ILessonRepository lessons,
        ILearnerStudyCourseRepository learnerStudyCourses,
        ILearnerNoteRepository notes,
        ILogger<NotesService> logger)
    {
        _learners = learners;
        _lessons = lessons;
        _learnerStudyCourses = learnerStudyCourses;
        _notes = notes;
        _logger = logger;
    }

    public async Task<CourseNotesResponse?> GetCourseNotesAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Getting notes for user {UserId}, course {CourseId}", userId, courseId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}", userId);
            return null;
        }

        var enrollment = await _learnerStudyCourses.GetByLearnerAndCourseAsync(learner.LearnerId, courseId);
        if (enrollment == null)
        {
            _logger.LogInformation("No enrollment found for user {UserId} in course {CourseId}", userId, courseId);
            return null;
        }

        var notes = await _notes.GetByCourseAsync(learner.LearnerId, courseId);
        return new CourseNotesResponse(
            CourseId: courseId,
            Notes: notes.Select(MapToDto).ToList()
        );
    }

    public async Task<LearnerNoteDto?> GetLessonNoteAsync(Guid userId, Guid lessonId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Getting note for user {UserId}, lesson {LessonId}", userId, lessonId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}", userId);
            return null;
        }

        var lesson = await _lessons.GetByIdAsync(lessonId);
        if (lesson == null)
        {
            _logger.LogWarning("Lesson {LessonId} not found", lessonId);
            return null;
        }

        var enrollment = await _learnerStudyCourses.GetByLearnerAndCourseAsync(learner.LearnerId, lesson.CourseId);
        if (enrollment == null)
        {
            _logger.LogInformation("No enrollment found for user {UserId} in course {CourseId}", userId, lesson.CourseId);
            return null;
        }

        var note = await _notes.GetAsync(learner.LearnerId, lessonId);
        return note == null
            ? new LearnerNoteDto(LessonId: lessonId, Content: null, UpdatedAt: null)
            : MapToDto(note);
    }

    public async Task<LearnerNoteDto?> UpsertLessonNoteAsync(Guid userId, Guid lessonId, string content, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Upserting note for user {UserId}, lesson {LessonId}", userId, lessonId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}", userId);
            return null;
        }

        var lesson = await _lessons.GetByIdAsync(lessonId);
        if (lesson == null)
        {
            _logger.LogWarning("Lesson {LessonId} not found", lessonId);
            return null;
        }

        var enrollment = await _learnerStudyCourses.GetByLearnerAndCourseAsync(learner.LearnerId, lesson.CourseId);
        if (enrollment == null)
        {
            _logger.LogInformation("No enrollment found for user {UserId} in course {CourseId}", userId, lesson.CourseId);
            return null;
        }

        // Deliberately appends: several notes per lesson are allowed (the unique
        // index on LearnerId+LessonId was dropped) and the course-level listing
        // shows them all. Reads return the most recently saved one.
        var note = new LearnerNote
        {
            LearnerId = learner.LearnerId,
            LessonId = lessonId,
            Content = content,
            UpdatedAt = DateTime.UtcNow,
        };
        await _notes.AddAsync(note, cancellationToken);
        await _notes.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Saved note for user {UserId}, lesson {LessonId}", userId, lessonId);

        return MapToDto(note);
    }

    public async Task<bool> DeleteLessonNoteAsync(Guid userId, Guid lessonId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Deleting note for user {UserId}, lesson {LessonId}", userId, lessonId);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}", userId);
            return false;
        }

        var lesson = await _lessons.GetByIdAsync(lessonId);
        if (lesson == null)
        {
            _logger.LogWarning("Lesson {LessonId} not found", lessonId);
            return false;
        }

        // Several notes can exist per lesson; remove them all so a subsequent read
        // (which returns the most recent note) reports the lesson as empty rather
        // than resurrecting an older draft.
        var notes = await _notes.GetAllForLessonAsync(learner.LearnerId, lessonId);
        if (notes.Count == 0)
            return true;

        foreach (var note in notes)
            _notes.Remove(note);
        await _notes.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted note for user {UserId}, lesson {LessonId}", userId, lessonId);

        return true;
    }

    private static LearnerNoteDto MapToDto(LearnerNote note)
        => new(
            LessonId: note.LessonId,
            Content: note.Content,
            UpdatedAt: note.UpdatedAt
        );
}