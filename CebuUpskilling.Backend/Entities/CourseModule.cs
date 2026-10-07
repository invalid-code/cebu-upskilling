using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class CourseModule : AuditableEntity
{
    [Key]
    public Guid ModuleId { get; set; }

    public Guid CourseId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public int Order { get; set; }

    public Course Course { get; set; } = null!;
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
}