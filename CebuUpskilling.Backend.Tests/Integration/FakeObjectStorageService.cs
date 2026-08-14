using CebuUpskilling.Backend.Services;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// In-memory stand-in for R2 object storage so the media upload endpoint can be
/// exercised without Cloudflare R2 credentials.
/// </summary>
public class FakeObjectStorageService : IObjectStorageService
{
    public Task<string> UploadAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default)
        => Task.FromResult($"https://fake-storage.example/{key}");

    public Task DeleteAsync(string key, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public string GetPublicUrl(string key) => $"https://fake-storage.example/{key}";
}
