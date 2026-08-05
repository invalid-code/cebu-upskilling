using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Discipline : AuditableEntity
{
    [Key]
    public int DomainId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    public ICollection<SubDiscipline> SubDisciplines { get; set; } = new List<SubDiscipline>();
}
