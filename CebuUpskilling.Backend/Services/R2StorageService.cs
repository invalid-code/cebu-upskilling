using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using CebuUpskilling.Backend.Options;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Services;

public class R2StorageService : IObjectStorageService
{
    private readonly AmazonS3Client? _client;
    private readonly R2Options _options;
    private readonly ILogger<R2StorageService> _logger;
    private readonly IWebHostEnvironment _env;
    private readonly bool _useLocal;

    public R2StorageService(IOptions<R2Options> options, ILogger<R2StorageService> logger, IWebHostEnvironment env)
    {
        _options = options.Value;
        _logger = logger;
        _env = env;

        _useLocal = string.IsNullOrWhiteSpace(_options.AccountId)
            || string.IsNullOrWhiteSpace(_options.AccessKeyId)
            || string.IsNullOrWhiteSpace(_options.SecretAccessKey)
            || string.IsNullOrWhiteSpace(_options.BucketName)
            || string.IsNullOrWhiteSpace(_options.PublicBaseUrl);

        if (_useLocal)
        {
            _logger.LogWarning("R2 storage is not configured; falling back to local disk storage under wwwroot/uploads");
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

    public async Task<string> UploadAsync(
        string key,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        if (_useLocal)
        {
            return await UploadLocalAsync(key, content, contentType, cancellationToken);
        }

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
        if (_useLocal)
        {
            await DeleteLocalAsync(key, cancellationToken);
            return;
        }

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

    public string GetPublicUrl(string key) => _useLocal
        ? $"/uploads/{key}"
        : $"{_options.PublicBaseUrl.TrimEnd('/')}/{key}";

    private string LocalRoot => Path.Combine(
        _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"),
        "uploads");

    private string LocalPathFor(string key)
    {
        var root = Path.GetFullPath(LocalRoot);
        var fullPath = Path.GetFullPath(Path.Combine(root, key));
        if (!fullPath.StartsWith(root, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid storage key");
        }
        return fullPath;
    }

    private async Task<string> UploadLocalAsync(
        string key,
        Stream content,
        string contentType,
        CancellationToken cancellationToken)
    {
        var fullPath = LocalPathFor(key);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await using var file = File.Create(fullPath);
        await content.CopyToAsync(file, cancellationToken);

        _logger.LogInformation("Uploaded {Key} to local storage at {Path}", key, fullPath);
        return $"/uploads/{key}";
    }

    private Task DeleteLocalAsync(string key, CancellationToken cancellationToken)
    {
        var fullPath = LocalPathFor(key);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            _logger.LogInformation("Deleted {Key} from local storage at {Path}", key, fullPath);
        }
        return Task.CompletedTask;
    }
}