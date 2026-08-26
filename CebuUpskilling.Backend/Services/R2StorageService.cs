using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using CebuUpskilling.Backend.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Services;

public class R2StorageService : IObjectStorageService
{
    private readonly AmazonS3Client? _client;
    private readonly R2Options _options;
    private readonly ILogger<R2StorageService> _logger;
    private readonly bool _isConfigured;

    public R2StorageService(IOptions<R2Options> options, ILogger<R2StorageService> logger)
    {
        _options = options.Value;
        _logger = logger;

        _isConfigured = !string.IsNullOrWhiteSpace(_options.AccountId)
            && !string.IsNullOrWhiteSpace(_options.AccessKeyId)
            && !string.IsNullOrWhiteSpace(_options.SecretAccessKey)
            && !string.IsNullOrWhiteSpace(_options.BucketName)
            && !string.IsNullOrWhiteSpace(_options.PublicBaseUrl);

        if (!_isConfigured)
        {
            _logger.LogWarning("R2 storage is not configured; uploads will fail until R2__* environment variables are set (strict R2-only mode)");
            return;
        }

        var config = new AmazonS3Config
        {
            ServiceURL = $"https://{_options.AccountId}.r2.cloudflarestorage.com",
            ForcePathStyle = true,
            RegionEndpoint = RegionEndpoint.USEast1
        };

        _client = new AmazonS3Client(_options.AccessKeyId, _options.SecretAccessKey, config);
    }

    private void EnsureConfigured()
    {
        if (!_isConfigured || _client is null)
        {
            throw new InvalidOperationException(
                "R2 storage is not configured. Set R2__AccountId, R2__AccessKeyId, R2__SecretAccessKey, R2__BucketName and R2__PublicBaseUrl. Local disk fallback is disabled — all files must go to Cloudflare R2.");
        }
    }

    public async Task<string> UploadAsync(
        string key,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        _logger.LogDebug("Uploading {Key} ({ContentType}) to R2", key, contentType);

        try
        {
            var request = new PutObjectRequest
            {
                BucketName = _options.BucketName,
                Key = key,
                InputStream = content,
                ContentType = contentType
            };

            await _client!.PutObjectAsync(request, cancellationToken);
            var publicUrl = GetPublicUrl(key);

            _logger.LogInformation("Uploaded {Key} to R2 at {PublicUrl}", key, publicUrl);

            return publicUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload {Key} to R2 bucket {Bucket}", key, _options.BucketName);
            throw;
        }
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        _logger.LogDebug("Deleting {Key} from R2", key);
        try
        {
            await _client!.DeleteObjectAsync(_options.BucketName, key, cancellationToken);
            _logger.LogInformation("Deleted {Key} from R2", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete {Key} from R2 bucket {Bucket}", key, _options.BucketName);
            throw;
        }
    }

    public string GetPublicUrl(string key)
    {
        EnsureConfigured();
        return $"{_options.PublicBaseUrl.TrimEnd('/')}/{key}";
    }
}