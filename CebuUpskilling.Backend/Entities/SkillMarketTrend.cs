using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

/// <summary>
/// Persisted job-market demand snapshot for a single skill, recomputed from
/// job posts whenever posts are created, updated or deleted
/// (see <c>JobMarketTrendService</c>).
/// </summary>
public class SkillMarketTrend
{
    [Key]
    public int SkillId { get; set; }

    /// <summary>Number of active posts requiring this skill.</summary>
    public int ActivePostings { get; set; }

    /// <summary>Number of total posts (active + inactive) requiring this skill.</summary>
    public int TotalPostings { get; set; }

    /// <summary>Average required level across all posts requiring this skill.</summary>
    public double AvgRequiredLevel { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Skill Skill { get; set; } = null!;
}
