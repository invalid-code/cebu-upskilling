namespace CebuUpskilling.Backend.Options;

/// <summary>
/// Configuration for the Resend email provider.
/// Provide values via environment variables (e.g. Email__ApiKey, Email__From)
/// or appsettings.json. The From address must be a domain verified in Resend,
/// or the Resend test sender "onboarding@resend.dev".
/// </summary>
public class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>
    /// Resend API key. When empty, the logging email service is used instead.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Verified sender address, e.g. "Cebu Upskilling &lt;no-reply@yourdomain.com&gt;".
    /// Defaults to the Resend test sender.
    /// </summary>
    public string From { get; set; } = "onboarding@resend.dev";

    public string BaseUrl { get; set; } = "https://api.resend.com";
}
