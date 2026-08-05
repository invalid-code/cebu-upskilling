using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Genre : AuditableEntity
{
    [Key]
    public int GenreId { get; set; }

    public int SubDisciplineId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    public SubDiscipline SubDiscipline { get; set; } = null!;
    public ICollection<Course> Courses { get; set; } = new List<Course>();
}
