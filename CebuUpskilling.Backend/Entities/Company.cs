using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Company
{
    [Key]
    public int CompanyId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(160)]
    public string? Tagline { get; set; }

    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [MaxLength(500)]
    public string? CoverImageUrl { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Industry { get; set; }

    [MaxLength(255)]
    public string? Website { get; set; }

    [MaxLength(255)]
    public string? LinkedInUrl { get; set; }

    [MaxLength(255)]
    public string? FacebookUrl { get; set; }

    [MaxLength(255)]
    public string? Location { get; set; }

    [MaxLength(20)]
    public string? CompanySize { get; set; }

    public ICollection<AppUser> Users { get; set; } = new List<AppUser>();
    public ICollection<Post> Posts { get; set; } = new List<Post>();
    public ICollection<Course> Courses { get; set; } = new List<Course>();
}
