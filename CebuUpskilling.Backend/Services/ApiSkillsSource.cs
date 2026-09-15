using System.Text.Json;
using CebuUpskilling.Backend.Options;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Pulls skill names from a remote HTTP API configured via
/// <c>SkillsSeed:SourceUrl</c>. Accepts a top-level JSON array of strings
/// (<c>["Welding", ...]</c>), an array of objects with a <c>name</c> (or
/// <c>skill</c>/<c>title</c>) property, or an object wrapping such an array
/// under <c>skills</c>/<c>data</c>/<c>items</c>. On any failure it falls back
/// to the <see cref="StaticSkillsCatalog"/> so the database still gets seeded.
/// </summary>
public class ApiSkillsSource : ISkillsSource
{
    private static readonly string[] NameProperties = ["name", "skill", "title"];
    private static readonly string[] WrapperProperties = ["skills", "data", "items"];

    private readonly HttpClient _httpClient;
    private readonly SkillsSeedOptions _options;
    private readonly ILogger<ApiSkillsSource> _logger;

    public ApiSkillsSource(
        HttpClient httpClient,
        IOptions<SkillsSeedOptions> options,
        ILogger<ApiSkillsSource> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<string>> GetSkillNamesAsync(CancellationToken cancellationToken = default)
    {
        var url = _options.SourceUrl;
        if (string.IsNullOrWhiteSpace(url))
            return StaticSkillsCatalog.Names;

        try
        {
            using var response = await _httpClient.GetAsync(url, cancellationToken);
            response.EnsureSuccessStatusCode();

            using var document = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);

            var names = ExtractNames(document.RootElement);
            if (names.Count == 0)
            {
                _logger.LogWarning("Skills API at {Url} returned no usable skill names; using static catalog", url);
                return StaticSkillsCatalog.Names;
            }

            _logger.LogInformation("Fetched {Count} skill names from skills API at {Url}", names.Count, url);
            return names;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch skills from {Url}; using static catalog", url);
            return StaticSkillsCatalog.Names;
        }
    }

    private static List<string> ExtractNames(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Array)
            return ExtractFromArray(element);

        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var wrapper in WrapperProperties)
            {
                if (element.TryGetProperty(wrapper, out var nested)
                    && nested.ValueKind == JsonValueKind.Array)
                    return ExtractFromArray(nested);
            }
        }

        return [];
    }

    private static List<string> ExtractFromArray(JsonElement array)
    {
        var names = new List<string>();
        foreach (var item in array.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                names.Add(item.GetString()!);
                continue;
            }

            if (item.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in NameProperties)
                {
                    if (item.TryGetProperty(prop, out var value)
                        && value.ValueKind == JsonValueKind.String)
                    {
                        names.Add(value.GetString()!);
                        break;
                    }
                }
            }
        }

        return names;
    }
}
