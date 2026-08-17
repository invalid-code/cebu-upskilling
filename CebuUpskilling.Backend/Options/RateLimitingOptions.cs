namespace CebuUpskilling.Backend.Options;

/// <summary>
/// Configuration for the ASP.NET Core rate limiting middleware.
/// Bound from the "RateLimiting" configuration section.
/// </summary>
public class RateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    /// <summary>Master switch for rate limiting. Default: true.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Global limiter applied to every endpoint (except endpoints with their own policy).</summary>
    public Policy Global { get; set; } = new() { PermitLimit = 120, WindowSeconds = 60 };

    /// <summary>Stricter limiter applied to authentication endpoints (login/register).</summary>
    public Policy Auth { get; set; } = new() { PermitLimit = 10, WindowSeconds = 60 };
}

public class Policy
{
    /// <summary>Maximum number of requests permitted within the window per client IP.</summary>
    public int PermitLimit { get; set; } = 100;

    /// <summary>Window length in seconds.</summary>
    public int WindowSeconds { get; set; } = 60;

    /// <summary>Number of excess requests that may be queued (0 = reject immediately).</summary>
    public int QueueLimit { get; set; } = 0;
}
