using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class LearnerAssessment
{
    [Key]
    public int LearnerAssessmentId { get; set; }

    public int LearnerId { get; set; }

    public int SkillId { get; set; }

    public int ScoredLevel { get; set; }

    public bool Verified { get; set; }

    public DateTime CompletedAt { get; set; }

    public Learner Learner { get; set; } = null!;
    public Skill Skill { get; set; } = null!;
}
