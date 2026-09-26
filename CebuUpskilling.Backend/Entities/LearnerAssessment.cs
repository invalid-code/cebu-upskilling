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

    /// <summary>
    /// JSON array of the <c>AssessmentQuestionId</c>s served for this attempt.
    /// Null until the learner first fetches the questions; grading must use this
    /// set as the denominator so a partial or forged answer payload cannot inflate
    /// the score, and so re-fetching returns the same questions.
    /// </summary>
    public string? QuestionIdsJson { get; set; }

    public Learner Learner { get; set; } = null!;
    public Skill Skill { get; set; } = null!;
}
