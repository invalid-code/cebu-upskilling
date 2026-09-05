using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.DTOs;

public record CourseManagementListDto(int CourseId, string Name, string? Description, string Status, int TechnicalLevel, string Mode, int ModuleCount, int LessonCount, DateTime? UpdatedAt);

public record CourseManagementDto(int CourseId, string Name, string? Description, string Status, int TechnicalLevel, string Mode, int? Price, int? GenreId, List<CourseManagementModuleDto> Modules);

public record CourseManagementModuleDto(int ModuleId, string Name, string? Description, int Order, List<CourseManagementLessonDto> Lessons);

public record CourseManagementLessonDto(int LessonId, string Name, string? Description, int Order, List<CourseManagementContentDto> Contents, List<MediaDto> Media);

public record CourseManagementContentDto(int ContentId, string BlockType, string? Content, int LessonOrder);

public class SaveCourseRequest
{
    [Required, MaxLength(255)] public string Name { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Description { get; set; }
    [Range(1, 5)] public int TechnicalLevel { get; set; } = 1;
    [Required, MaxLength(50)] public string Mode { get; set; } = "Online";
    public int? Price { get; set; }
    public int? GenreId { get; set; }
    public List<SaveModuleRequest> Modules { get; set; } = new();
}

public class SaveModuleRequest
{
    [Required, MaxLength(255)] public string Name { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Description { get; set; }
    public int Order { get; set; }
    public List<SaveLessonRequest> Lessons { get; set; } = new();
}

public class SaveLessonRequest
{
    [Required, MaxLength(255)] public string Name { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Description { get; set; }
    public int Order { get; set; }
    public List<SaveLessonContentRequest> Contents { get; set; } = new();
}

public class SaveLessonContentRequest
{
    [MaxLength(100)] public string? BlockType { get; set; }
    public string? Content { get; set; }
}
