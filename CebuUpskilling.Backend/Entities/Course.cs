using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Course : AuditableEntity
{
    [Key]
    public Guid CourseId { get; set; }

    public Guid GenreId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public int TechnicalLevel { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    public int? Price { get; set; }

    public Guid? CompanyId { get; set; }

    [Required, MaxLength(20)]
    public string Status { get; set; } = "Draft";

    [Required, MaxLength(50)]
    public string Mode { get; set; } = "Online";

    /// <summary>
    /// When true, the provider has opted this course in to certificates.
    /// A certificate is issued automatically once a learner reaches 100%.
    /// </summary>
    public bool IssuesCertificate { get; set; }

    public Genre Genre { get; set; } = null!;
    public Company? Company { get; set; }
    public ICollection<CourseModule> Modules { get; set; } = new List<CourseModule>();
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    public ICollection<LearnerStudyCourse> LearnerStudyCourses { get; set; } = new List<LearnerStudyCourse>();
    public ICollection<PostCourseRequired> PostCourseRequireds { get; set; } = new List<PostCourseRequired>();
    public ICollection<CourseSkill> CourseSkills { get; set; } = new List<CourseSkill>();
    public ICollection<CourseCertificate> Certificates { get; set; } = new List<CourseCertificate>();
}
