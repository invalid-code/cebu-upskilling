namespace CebuUpskilling.Backend.Services;

public interface IObjectStorageService
{
    Task<string> UploadAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default);
    Task DeleteAsync(string key, CancellationToken cancellationToken = default);
    string GetPublicUrl(string key);
}
