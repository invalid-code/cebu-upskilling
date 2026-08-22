namespace CebuUpskilling.Backend.DTOs;

public record LearnerNoteDto(
    int LessonId,
    string? Content,
    DateTime? UpdatedAt
);

public record CourseNotesResponse(
    int CourseId,
    List<LearnerNoteDto> Notes
);

public record UpsertNoteRequest(
    string Content
);