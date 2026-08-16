using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CebuUpskilling.Backend.Entities;

public class Application
{
    [Key]
    public int ApplicationId { get; set; }

    public int LearnerId { get; set; }

    public int PostId { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "applied";

    public DateTime AppliedAt { get; set; }

    public DateTime? SavedAt { get; set; }

    public Learner Learner { get; set; } = null!;
    public Post Post { get; set; } = null!;
}
