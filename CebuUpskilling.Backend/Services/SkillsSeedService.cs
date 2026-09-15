using System.Text.RegularExpressions;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Services;

/// <summary>Outcome of a single <see cref="SkillsSeedService"/> seed pass.</summary>
public sealed record SkillsSeedResult(int Fetched, int Inserted, int Skipped);

/// <summary>
/// Background job that fills the <c>Skills</c> table from an <see cref="ISkillsSource"/>.
/// Runs once shortly after startup and then every <c>SkillsSeed:IntervalHours</c>.
/// Inserts are idempotent: names are normalized (trimmed, whitespace-collapsed,
/// de-duplicated case-insensitively) and only names missing from the table —
/// matched case-insensitively — are inserted. Failures are logged without
/// crashing the host; the next scheduled pass retries.
/// </summary>
public class SkillsSeedService : BackgroundService
{
    /// <summary>Must stay in sync with <c>Skill.Name MaxLength(100)</c>.</summary>
    public const int MaxNameLength = 100;

    private static readonly Regex Whitespace = new(@"\s+", RegexOptions.Compiled);

    private readonly IServiceScopeFactory _scopes;
    private readonly SkillsSeedOptions _options;
    private readonly ILogger<SkillsSeedService> _logger;

    public SkillsSeedService(
        IServiceScopeFactory scopes,
        IOptions<SkillsSeedOptions> options,
        ILogger<SkillsSeedService> logger)
    {
        _scopes = scopes;
        _options = options.Value;
        _logger = logger;
    }

    /// <summary>
    /// Runs a single seed pass. Public so it can be reused (tests, future admin trigger).
    /// </summary>
    public async Task<SkillsSeedResult> SeedAsync(CancellationToken cancellationToken = default)
    {
        using var scope = _scopes.CreateScope();
        var source = scope.ServiceProvider.GetRequiredService<ISkillsSource>();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var fetched = await source.GetSkillNamesAsync(cancellationToken);
        var names = NormalizeNames(fetched);

        if (names.Count == 0)
        {
            _logger.LogWarning("Skills seed fetched {Fetched} raw names but none were usable", fetched.Count);
            return new SkillsSeedResult(fetched.Count, 0, 0);
        }

        var existing = new HashSet<string>(
            await db.Skills.Select(s => s.Name).ToListAsync(cancellationToken),
            StringComparer.OrdinalIgnoreCase);

        var missing = names.Where(n => !existing.Contains(n)).ToList();
        foreach (var name in missing)
            db.Skills.Add(new Skill { Name = name });

        await db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Skills seed complete: fetched {Fetched}, inserted {Inserted}, already present {Skipped}",
            fetched.Count, missing.Count, names.Count - missing.Count);

        return new SkillsSeedResult(fetched.Count, missing.Count, names.Count - missing.Count);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Skills seed job is disabled (SkillsSeed:Enabled=false)");
            return;
        }

        if (_options.RunOnStartup)
        {
            var delay = TimeSpan.FromSeconds(Math.Max(0, _options.StartupDelaySeconds));
            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }

            await RunPassAsync(stoppingToken);
        }

        var interval = TimeSpan.FromHours(_options.IntervalHours);
        if (interval <= TimeSpan.Zero)
            return;

        using var timer = new PeriodicTimer(interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await RunPassAsync(stoppingToken);
    }

    private async Task RunPassAsync(CancellationToken cancellationToken)
    {
        try
        {
            await SeedAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Never crash the host over seed data; retry on the next scheduled pass.
            _logger.LogError(ex, "Skills seed pass failed; will retry on the next scheduled run");
        }
    }

    internal static IReadOnlyList<string> NormalizeNames(IEnumerable<string?> raw)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var result = new List<string>();

        foreach (var entry in raw)
        {
            if (string.IsNullOrWhiteSpace(entry))
                continue;

            var name = Whitespace.Replace(entry.Trim(), " ");
            if (name.Length == 0 || name.Length > MaxNameLength)
                continue;

            if (seen.Add(name))
                result.Add(name);
        }

        return result;
    }
}
