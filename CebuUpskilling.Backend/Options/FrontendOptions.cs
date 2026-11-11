namespace CebuUpskilling.Backend.Options;

/// <summary>
/// Configuration for links the API embeds in outbound email (password reset,
/// email confirmation). Must point at the publicly reachable SPA origin, not
/// localhost, otherwise the links are unusable outside local development.
/// Provide via Frontend:BaseUrl (appsettings) or Frontend__BaseUrl (env).
/// </summary>
public class FrontendOptions
{
    public const string SectionName = "Frontend";

    /// <summary>
    /// Absolute origin of the SPA, e.g. https://cebu-upskilling.vercel.app.
    /// </summary>
    public string BaseUrl { get; set; } = "http://localhost:5173";
}
