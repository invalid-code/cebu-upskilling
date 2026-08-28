using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Skill
{
    [Key]
    public int SkillId { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Category { get; set; }

    public ICollection<RoleSkill> RoleSkills { get; set; } = new List<RoleSkill>();
    public ICollection<LearnerSkill> LearnerSkills { get; set; } = new List<LearnerSkill>();
    public ICollection<PostSkill> PostSkills { get; set; } = new List<PostSkill>();
}
