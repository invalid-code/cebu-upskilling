using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

/// <summary>
/// Persisted job-market demand snapshot for a single target role, recomputed from
/// job posts whenever posts are created, updated or deleted
/// (see <c>JobMarketTrendService</c>).
/// </summary>
public class RoleMarketTrend
{
    [Key, MaxLength(100)]
    public string TargetRole { get; set; } = string.Empty;

    /// <summary>Number of active posts for this target role.</summary>
    public int ActivePostings { get; set; }

    /// <summary>Number of total posts (active + inactive) for this target role.</summary>
    public int TotalPostings { get; set; }

    public DateTime UpdatedAt { get; set; }
}
