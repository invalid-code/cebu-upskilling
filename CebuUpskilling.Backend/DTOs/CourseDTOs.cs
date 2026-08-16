namespace CebuUpskilling.Backend.DTOs;

public record CourseDto(
    int CourseId,
    string Name,
    string Provider,
    string? Description,
    int? Price,
    bool IsFree,
    string Mode,
    int TechnicalLevel,
    int LessonCount,
    string? Category
);

public record EnrollmentDto(
    int CourseId,
    string CourseName,
    DateTime? Started,
    int ProgressPercent,
    string? CurrentModule,
    int TotalModules,
    int TechnicalLevel
);

public record RecommendedCourseDto(
    int CourseId,
    string Name,
    string Provider,
    string? Description,
    int? Price,
    bool IsFree,
    string Mode,
    int TechnicalLevel,
    int LessonCount,
    string? Category,
    bool IsEnrolled,
    int ProgressPercent,
    bool IsCompleted,
    bool IsRecommended,
    string? RecommendedReason,
    int? UnlocksJobsCount
);

public record CoursesPageResponse(
    List<EnrollmentDto> EnrolledCourses,
    List<RecommendedCourseDto> RecommendedCourses,
    int DayStreak,
    int CoursesInProgress,
    int CertificatesEarned
);

public record CourseRecommendationRequest(
    string? Category
);

public record LessonSummaryDto(
    int LessonId,
    string Name,
    string? Description
);

public record ModuleSummaryDto(
    int ModuleNumber,
    string Name,
    string? Description,
    int LessonCount,
    List<LessonSummaryDto> Lessons
);

public record CourseDetailDto(
    int CourseId,
    string Name,
    string Provider,
    string? Description,
    int TechnicalLevel,
    string Mode,
    int LessonCount,
    string? Category,
    bool IsEnrolled,
    int ProgressPercent,
    int TotalModules,
    int CompletedModules,
    List<ModuleSummaryDto> Modules
);
