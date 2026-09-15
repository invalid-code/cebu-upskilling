namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Abstraction over where skill names come from. There is no upstream source yet,
/// so <see cref="StaticSkillsSource"/> serves the built-in catalog. When a real API
/// becomes available, set <c>SkillsSeed:SourceUrl</c> and <see cref="ApiSkillsSource"/>
/// takes over — the seed job itself does not change.
/// </summary>
public interface ISkillsSource
{
    Task<IReadOnlyList<string>> GetSkillNamesAsync(CancellationToken cancellationToken = default);
}
