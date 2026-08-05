using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Learner
{
    [Key]
    public int LearnerId { get; set; }

    public int UserId { get; set; }

    public bool IsPremium { get; set; }

    public AppUser User { get; set; } = null!;
    public ICollection<LearnerStudyCourse> LearnerStudyCourses { get; set; } = new List<LearnerStudyCourse>();
}
