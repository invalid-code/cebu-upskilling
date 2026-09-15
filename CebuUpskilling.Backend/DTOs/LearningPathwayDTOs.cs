namespace CebuUpskilling.Backend.DTOs;

public record PathwayCourseDto(
    int CourseId,
    string Name,
    string Provider,
    string Mode,
    int TechnicalLevel,
    bool IsFree,
    bool IsEnrolled,
    int ProgressPercent);

public record PathwayStepDto(
    int StepNumber,
    int SkillId,
    string SkillName,
    string? Category,
    int CurrentLevel,
    int RequiredLevel,
    int Gap,
    int ActivePostings,
    double PriorityScore,
    List<PathwayCourseDto> RecommendedCourses,
    string SuggestedAction);

public record LearningPathwayResponse(
    string TargetRole,
    int MatchPercent,
    int RoleActivePostings,
    int TotalGaps,
    List<PathwayStepDto> Steps,
    DateTime GeneratedAt);
