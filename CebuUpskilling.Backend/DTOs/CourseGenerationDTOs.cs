using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CebuUpskilling.Backend.DTOs;

public record CourseGenerationRequest(
    [property: Required, MaxLength(4000)] string Brief,
    [property: Range(1, 5)] int TechnicalLevel = 3,
    [property: Required, MaxLength(50)] string Mode = "Online",
    [property: Range(2, 10)] int ModuleCount = 4,
    [property: Range(1, 8)] int LessonsPerModule = 3
);

public record CourseGenerationPromptContext(
    string Brief,
    int TechnicalLevel,
    string Mode,
    int ModuleCount,
    int LessonsPerModule,
    IReadOnlyList<CourseGenerationAvailableSkill> AvailableSkills
);

public record CourseGenerationAvailableSkill(int SkillId, string Name, string? Category);

public record CourseGenerationSkillMatch(
    int SkillId,
    string Name,
    string? Category
);

public record CourseGenerationResult(
    [property: Required, MaxLength(255)] string Name,
    [property: MaxLength(2000)] string? Description,
    [property: Range(1, 5)] int TechnicalLevel,
    [property: Required, MaxLength(50)] string Mode,
    [property: MaxLength(2000)] string? Rationale,
    List<CourseGenerationModuleDraft> Modules,
    List<CourseGenerationSkillMatch> MatchedSkills
);

public record CourseGenerationModuleDraft(
    [property: Required, MaxLength(255)] string Name,
    [property: MaxLength(2000)] string? Description,
    int Order,
    List<CourseGenerationLessonDraft> Lessons
);

public record CourseGenerationLessonDraft(
    [property: Required, MaxLength(255)] string Name,
    [property: MaxLength(2000)] string? Description,
    int Order
);

public record CommitCourseGenerationRequest(
    [property: Required] CourseGenerationResult Draft,
    int? GenreId,
    int? Price
);

public record CommitCourseGenerationResponse(
    int CourseId,
    string Name,
    string Status
);
