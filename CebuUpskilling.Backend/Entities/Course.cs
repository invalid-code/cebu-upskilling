using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Course : AuditableEntity
{
    [Key]
    public int CourseId { get; set; }

    public int GenreId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public int TechnicalLevel { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    public int? Price { get; set; }

    public Genre Genre { get; set; } = null!;
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    public ICollection<LearnerStudyCourse> LearnerStudyCourses { get; set; } = new List<LearnerStudyCourse>();
    public ICollection<PostCourseRequired> PostCourseRequireds { get; set; } = new List<PostCourseRequired>();
}
