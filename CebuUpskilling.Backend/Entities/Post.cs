using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Post
{
    [Key]
    public int PostId { get; set; }

    public int RecruiterId { get; set; }

    public int? CompanyId { get; set; }

    [Required, MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(5000)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? TargetRole { get; set; }

    public Recruiter Recruiter { get; set; } = null!;
    public Company? Company { get; set; }
    public ICollection<PostCourseRequired> PostCourseRequireds { get; set; } = new List<PostCourseRequired>();
}
