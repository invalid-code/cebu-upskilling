namespace CebuUpskilling.Backend.Options;

/// <summary>
/// TTLs for service-layer caches (IMemoryCache). Bound from the "ServiceCache" section.
/// Short TTLs for per-user computed data (staleness bounded in minutes, no
/// cross-service eviction); long TTLs for reference data and AI outputs.
/// Failures and empty AI results are never cached.
/// </summary>
public class ServiceCacheOptions
{
    public const string SectionName = "ServiceCache";

    /// <summary>Master switch. Default: true.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Shared reference data (market trends). Default: 240 minutes.</summary>
    public int ReferenceDataMinutes { get; set; } = 240;

    /// <summary>Per-user computed data (gaps, pathway, courses page). Default: 2 minutes.</summary>
    public int UserComputedMinutes { get; set; } = 2;

    /// <summary>Stats snapshots. Default: 5 minutes.</summary>
    public int StatsMinutes { get; set; } = 5;

    /// <summary>Deterministic AI outputs (resume parse, course outline). Default: 24 hours.</summary>
    public int GeminiHours { get; set; } = 24;
}
