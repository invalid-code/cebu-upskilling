using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class LearnerStudyCourse
{
    public Guid LearnerId { get; set; }

    public Guid CourseId { get; set; }

    public DateTime? Started { get; set; }

    public int LastTotalProgressPercent { get; set; }

    public DateTime? LastOnline { get; set; }

    public Learner Learner { get; set; } = null!;
    public Course Course { get; set; } = null!;
}
