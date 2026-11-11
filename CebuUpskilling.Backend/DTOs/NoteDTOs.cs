namespace CebuUpskilling.Backend.DTOs;

public record LearnerNoteDto(
    Guid LessonId,
    string? Content,
    DateTime? UpdatedAt
);

public record CourseNotesResponse(
    Guid CourseId,
    List<LearnerNoteDto> Notes
);

public record UpsertNoteRequest(
    string Content
);