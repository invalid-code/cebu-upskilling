namespace CebuUpskilling.Backend.Options;

public class OpenRouterOptions
{
    public const string SectionName = "OpenRouter";

    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "nvidia/nemotron-3-ultra-550b-a55b:free";
    public string BaseUrl { get; set; } = "https://openrouter.ai/api/v1";
    public string AppUrl { get; set; } = string.Empty;
    public string AppName { get; set; } = string.Empty;
}
