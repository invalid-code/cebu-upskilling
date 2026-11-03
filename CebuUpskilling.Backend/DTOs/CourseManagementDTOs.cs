using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.DTOs;

public record CourseManagementListDto(Guid CourseId, string Name, string? Description, string Status, int TechnicalLevel, string Mode, int ModuleCount, int LessonCount, DateTime? UpdatedAt, bool IssuesCertificate, int CertificatesIssued);

public record CourseManagementDto(Guid CourseId, string Name, string? Description, string Status, int TechnicalLevel, string Mode, int? Price, Guid? GenreId, bool IssuesCertificate, int CertificatesIssued, List<CourseManagementModuleDto> Modules);

public record CourseManagementModuleDto(Guid ModuleId, string Name, string? Description, int Order, List<CourseManagementLessonDto> Lessons);

public record CourseManagementLessonDto(Guid LessonId, string Name, string? Description, int Order, List<CourseManagementContentDto> Contents, List<MediaDto> Media);

public record CourseManagementContentDto(Guid ContentId, string BlockType, string? Content, int LessonOrder);

public class SaveCourseRequest
{
    [Required, MaxLength(255)] public string Name { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Description { get; set; }
    [Range(1, 5)] public int TechnicalLevel { get; set; } = 1;
    [Required, MaxLength(50)] public string Mode { get; set; } = "Online";
    public int? Price { get; set; }
    public Guid? GenreId { get; set; }
    /// <summary>
    /// When enabled, learners who reach 100% automatically receive a certificate.
    /// Saving an update also backfills certificates for learners who have already
    /// completed the course.
    /// </summary>
    public bool IssuesCertificate { get; set; }
    public List<SaveModuleRequest> Modules { get; set; } = new();
}

public class SaveModuleRequest
{
    /// <summary>
    /// Existing module id echoed back by the client. When it matches a module of the
    /// course being saved the module is updated in place instead of deleted and
    /// recreated, which keeps its lessons (and their notes/discussions) alive.
    /// </summary>
    public Guid? ModuleId { get; set; }
    [Required, MaxLength(255)] public string Name { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Description { get; set; }
    public int Order { get; set; }
    public List<SaveLessonRequest> Lessons { get; set; } = new();
}

public class SaveLessonRequest
{
    public Guid? LessonId { get; set; }
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
