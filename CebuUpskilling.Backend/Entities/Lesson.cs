using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Lesson : AuditableEntity
{
    [Key]
    public int LessonId { get; set; }

    public int CourseId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public Course Course { get; set; } = null!;
    public ICollection<LessonContent> LessonContents { get; set; } = new List<LessonContent>();
    public ICollection<Media> Media { get; set; } = new List<Media>();
    public ICollection<Exercise> Exercises { get; set; } = new List<Exercise>();
}
