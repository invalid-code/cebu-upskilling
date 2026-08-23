using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Company
{
    [Key]
    public int CompanyId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public ICollection<AppUser> Users { get; set; } = new List<AppUser>();
    public ICollection<Post> Posts { get; set; } = new List<Post>();
}
