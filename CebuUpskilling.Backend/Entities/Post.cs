using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Post
{
    [Key]
    public int PostId { get; set; }

    public int CompanyId { get; set; }

    [Required, MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(5000)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string TargetRole { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Location { get; set; }

    [MaxLength(100)]
    public string? SalaryRange { get; set; }

    [MaxLength(50)]
    public string JobType { get; set; } = "Full-time";

    [MaxLength(50)]
    public string? ExperienceLevel { get; set; }

    [MaxLength(5000)]
    public string? Requirements { get; set; }

    [MaxLength(5000)]
    public string? Benefits { get; set; }

    public bool IsRemote { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public bool IsActive { get; set; } = true;

    [MaxLength(500)]
    public string? CompanyLogoUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    public Company Company { get; set; } = null!;
    public ICollection<PostCourseRequired> PostCourseRequireds { get; set; } = new List<PostCourseRequired>();
}
