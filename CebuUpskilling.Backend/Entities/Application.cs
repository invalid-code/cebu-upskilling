using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CebuUpskilling.Backend.Entities;

public class Application
{
    [Key]
    public Guid ApplicationId { get; set; }

    public Guid LearnerId { get; set; }

    public Guid PostId { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "applied";

    public DateTime AppliedAt { get; set; }

    public DateTime? SavedAt { get; set; }

    [MaxLength(1000)]
    public string? ResumeUrl { get; set; }

    [MaxLength(1000)]
    public string? CoverLetterUrl { get; set; }

    public Learner Learner { get; set; } = null!;
    public Post Post { get; set; } = null!;
}
