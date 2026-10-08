namespace CebuUpskilling.Backend.Options;

/// <summary>
/// Configuration for duplicate GET request caching.
/// Bound from the "DuplicateRequestCache" configuration section.
/// </summary>
public class DuplicateRequestCacheOptions
{
    public const string SectionName = "DuplicateRequestCache";

    /// <summary>Master switch. Default: true.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>How long an identical GET response is served from cache. Default: 15 seconds.</summary>
    public int TtlSeconds { get; set; } = 15;

    /// <summary>Maximum response body size (bytes) eligible for caching. Default: 256 KB.</summary>
    public int MaxCachedBodyBytes { get; set; } = 256 * 1024;
}
