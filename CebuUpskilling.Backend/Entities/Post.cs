using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CebuUpskilling.Backend.DTOs;

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
    public string TargetRole { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Schedule { get; set; } = "Full-time";

    public Recruiter Recruiter { get; set; } = null!;
    public Company? Company { get; set; }
    public ICollection<PostCourseRequired> PostCourseRequireds { get; set; } = new List<PostCourseRequired>();
    public ICollection<PostSkill> PostSkills { get; set; } = new List<PostSkill>();

    [NotMapped]
    public List<RequiredSkillInput>? RequiredSkills { get; set; }
}