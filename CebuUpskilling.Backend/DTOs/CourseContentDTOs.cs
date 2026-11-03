namespace CebuUpskilling.Backend.DTOs;

public record LessonContentBlockDto(
    Guid ContentId,
    string BlockType,
    string? Content,
    int LessonOrder,
    int TopicOrder
);

public record MediaDto(
    Guid MediaId,
    string PathFile,
    string Type,
    double MbSize
);

public record DocumentUploadDto(
    string Url,
    string FileName,
    long SizeBytes
);

public record ExerciseDto(
    Guid ExerciseId,
    string Type,
    string? AnswerKey,
    string? Content,
    string? ContentType
);

public record LessonDetailDto(
    Guid LessonId,
    string Name,
    string? Description,
    int LessonOrder,
    List<LessonContentBlockDto> ContentBlocks,
    List<MediaDto> Media,
    List<ExerciseDto> Exercises
);

public record CourseModuleDto(
    int ModuleNumber,
    string Name,
    string? Description,
    int LessonCount,
    int CompletedLessonCount,
    List<LessonOutlineDto> Lessons
);

public record LessonOutlineDto(
    Guid LessonId,
    string Name,
    int DurationMinutes,
    bool IsCompleted,
    bool IsCurrent
);

public record CourseContentResponse(
    Guid CourseId,
    string CourseName,
    string? Description,
    int TotalLessons,
    int CompletedLessons,
    int ProgressPercent,
    List<CourseModuleDto> Modules,
    LessonDetailDto CurrentLesson
);

public record LessonProgressDto(
    Guid LessonId,
    bool IsCompleted,
    int ProgressPercent,
    Guid? CertificateId = null
);

public record UpdateLessonProgressRequest(
    Guid LessonId,
    int ProgressPercent
);
