using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class RoleSkill
{
    [Key]
    public Guid RoleSkillId { get; set; }

    [Required, MaxLength(100)]
    public string TargetRole { get; set; } = string.Empty;

    public Guid SkillId { get; set; }

    public int RequiredLevel { get; set; }

    public Skill Skill { get; set; } = null!;
}
