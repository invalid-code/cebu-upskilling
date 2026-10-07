using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class LearnerSkill
{
    [Key]
    public Guid LearnerSkillId { get; set; }

    public Guid LearnerId { get; set; }

    public Guid SkillId { get; set; }

    public int CurrentLevel { get; set; }

    public bool Verified { get; set; }

    public Learner Learner { get; set; } = null!;
    public Skill Skill { get; set; } = null!;
}
