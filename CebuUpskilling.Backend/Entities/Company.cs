using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Company
{
    [Key]
    public int CompanyId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public ICollection<Recruiter> Recruiters { get; set; } = new List<Recruiter>();
    public ICollection<Post> Posts { get; set; } = new List<Post>();
}
