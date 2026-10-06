namespace CebuUpskilling.Backend.Options;

public class GoogleAiOptions
{
    public const string SectionName = "GoogleAi";

    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gemini-3-flash-preview";
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";
}
