namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Serves the built-in <see cref="StaticSkillsCatalog"/>. Used while there is no
/// upstream skills API (i.e. <c>SkillsSeed:SourceUrl</c> is empty).
/// </summary>
public class StaticSkillsSource : ISkillsSource
{
    public Task<IReadOnlyList<string>> GetSkillNamesAsync(CancellationToken cancellationToken = default)
        => Task.FromResult<IReadOnlyList<string>>(StaticSkillsCatalog.Names);
}
