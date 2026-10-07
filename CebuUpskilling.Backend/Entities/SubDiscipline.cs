using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class SubDiscipline : AuditableEntity
{
    [Key]
    public Guid SubDisciplineId { get; set; }

    public Guid DisciplineId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    public Discipline Discipline { get; set; } = null!;
    public ICollection<Genre> Genres { get; set; } = new List<Genre>();
}
