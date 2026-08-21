using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using CebuUpskilling.Backend.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Services;

public class R2StorageService : IObjectStorageService
{
    private readonly AmazonS3Client _client;
    private readonly R2Options _options;
    private readonly ILogger<R2StorageService> _logger;

    public R2StorageService(IOptions<R2Options> options, ILogger<R2StorageService> logger)
    {
        _options = options.Value;
        _logger = logger;

        ValidateOptions(_options);

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

            await _client.PutObjectAsync(request, cancellationToken);
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
        _logger.LogDebug("Deleting {Key} from R2", key);
        try
        {
            await _client.DeleteObjectAsync(_options.BucketName, key, cancellationToken);
            _logger.LogInformation("Deleted {Key} from R2", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete {Key} from R2 bucket {Bucket}", key, _options.BucketName);
            throw;
        }
    }

    public string GetPublicUrl(string key) => $"{_options.PublicBaseUrl.TrimEnd('/')}/{key}";

    private static void ValidateOptions(R2Options o)
    {
        if (string.IsNullOrWhiteSpace(o.AccountId)
            || string.IsNullOrWhiteSpace(o.AccessKeyId)
            || string.IsNullOrWhiteSpace(o.SecretAccessKey)
            || string.IsNullOrWhiteSpace(o.BucketName)
            || string.IsNullOrWhiteSpace(o.PublicBaseUrl))
        {
            throw new InvalidOperationException(
                "R2 options are not fully configured. Set R2:AccountId, R2:AccessKeyId, R2:SecretAccessKey, R2:BucketName and R2:PublicBaseUrl in appsettings.json or as environment variables.");
        }
    }
}
