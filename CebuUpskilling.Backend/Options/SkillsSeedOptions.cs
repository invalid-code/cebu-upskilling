namespace CebuUpskilling.Backend.Options;

/// <summary>
/// Configuration for the skills seed background job (<c>SkillsSeedService</c>).
/// Bound from the "SkillsSeed" configuration section.
/// </summary>
public class SkillsSeedOptions
{
    public const string SectionName = "SkillsSeed";

    /// <summary>Master switch for the skills seed job. Default: true.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Run a seed pass shortly after startup. Default: true.</summary>
    public bool RunOnStartup { get; set; } = true;

    /// <summary>Delay before the startup run, in seconds. Default: 10.</summary>
    public double StartupDelaySeconds { get; set; } = 10;

    /// <summary>
    /// Repeat interval in hours. Values &lt;= 0 mean run once (startup only, no repeat).
    /// Default: 24.
    /// </summary>
    public double IntervalHours { get; set; } = 24;

    /// <summary>
    /// Optional HTTP(S) URL of a skills API. When set, <c>ApiSkillsSource</c> is used;
    /// otherwise the static catalog (<c>StaticSkillsSource</c>) is used.
    /// </summary>
    public string? SourceUrl { get; set; }
}
