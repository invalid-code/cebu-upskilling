using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class LearnerSkill
{
    [Key]
    public int LearnerSkillId { get; set; }

    public int LearnerId { get; set; }

    public int SkillId { get; set; }

    public int CurrentLevel { get; set; }

    public bool Verified { get; set; }

    public Learner Learner { get; set; } = null!;
    public Skill Skill { get; set; } = null!;
}
