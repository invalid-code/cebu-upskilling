using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Learner
{
    [Key]
    public Guid LearnerId { get; set; }

    public Guid UserId { get; set; }

    public bool IsPremium { get; set; }

    public AppUser User { get; set; } = null!;
    public ICollection<LearnerStudyCourse> LearnerStudyCourses { get; set; } = new List<LearnerStudyCourse>();
    public ICollection<LearnerSkill> LearnerSkills { get; set; } = new List<LearnerSkill>();
    public ICollection<LearnerAssessment> LearnerAssessments { get; set; } = new List<LearnerAssessment>();
    public ICollection<LearnerNote> LearnerNotes { get; set; } = new List<LearnerNote>();
    public ICollection<DiscussionPost> DiscussionPosts { get; set; } = new List<DiscussionPost>();
}
