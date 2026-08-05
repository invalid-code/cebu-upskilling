using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class SubDiscipline : AuditableEntity
{
    [Key]
    public int SubDisciplineId { get; set; }

    public int DisciplineId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    public Discipline Discipline { get; set; } = null!;
    public ICollection<Genre> Genres { get; set; } = new List<Genre>();
}
