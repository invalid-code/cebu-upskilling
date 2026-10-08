namespace CebuUpskilling.Backend.Services;

public interface IAnalyticsService
{
    /// <summary>
    /// Tracks a server-side product event. No-op when PostHog is not
    /// configured. Never pass emails, tokens, or resume text as properties.
    /// </summary>
    Task TrackAsync(string eventName, Guid userId, Dictionary<string, object?>? properties = null, CancellationToken ct = default);
}

public class PostHogAnalyticsService : IAnalyticsService
{
    private readonly PostHog.IPostHogClient _client;
    private readonly ILogger<PostHogAnalyticsService> _logger;

    public PostHogAnalyticsService(PostHog.IPostHogClient client, ILogger<PostHogAnalyticsService> logger)
    {
        _client = client;
        _logger = logger;
    }

    public Task TrackAsync(string eventName, Guid userId, Dictionary<string, object?>? properties = null, CancellationToken ct = default)
    {
        try
        {
            var props = new Dictionary<string, object>();
            if (properties != null)
                foreach (var (key, value) in properties)
                    if (value != null) props[key] = value;
            PostHog.CaptureExtensions.Capture(_client, userId.ToString(), eventName, props);
        }
        catch (Exception ex)
        {
            // Analytics must never break product flows.
            _logger.LogWarning(ex, "PostHog capture failed for {Event}", eventName);
        }
        return Task.CompletedTask;
    }
}

public class NoOpAnalyticsService : IAnalyticsService
{
    public Task TrackAsync(string eventName, Guid userId, Dictionary<string, object?>? properties = null, CancellationToken ct = default)
        => Task.CompletedTask;
}
