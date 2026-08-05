using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class LearnerStudyCourse
{
    public int LearnerId { get; set; }

    public int CourseId { get; set; }

    public DateTime? Started { get; set; }

    public int LastTotalProgressPercent { get; set; }

    public DateTime? LastOnline { get; set; }

    public Learner Learner { get; set; } = null!;
    public Course Course { get; set; } = null!;
}
