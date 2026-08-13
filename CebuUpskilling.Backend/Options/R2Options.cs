namespace CebuUpskilling.Backend.Options;

/// <summary>
/// Configuration options for R2 service integration.
/// All values should be provided via environment variables or configuration files.
/// Hardcoded values are intentionally left empty to prevent accidental exposure.
/// </summary>
public class R2Options
{
    public const string SectionName = "R2";

    /// <summary>
    /// AWS Account ID for R2 integration.
    /// Must be set via environment variable R2__AccountId.
    /// </summary>
    public string AccountId { get; set; } = string.Empty;

    /// <summary>
    /// AWS Access Key ID for R2 integration.
    /// Must be set via environment variable R2__AccessKeyId.
    /// </summary>
    public string AccessKeyId { get; set; } = string.Empty;

    /// <summary>
    /// AWS Secret Access Key for R2 integration.
    /// Must be set via environment variable R2__SecretAccessKey.
    /// </summary>
    public string SecretAccessKey { get; set; } = string.Empty;

    /// <summary>
    /// AWS S3 bucket name for R2 integration.
    /// Must be set via environment variable R2__BucketName.
    /// </summary>
    public string BucketName { get; set; } = string.Empty;

    /// <summary>
    /// Public base URL for R2 integration.
    /// Must be set via environment variable R2__PublicBaseUrl.
    /// </summary>
    public string PublicBaseUrl { get; set; } = string.Empty;
}
