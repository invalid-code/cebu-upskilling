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
            _logger.LogWarning("R2 storage is not configured; document uploads are disabled (no secrets logged)");
            return;
        }

        var config = new AmazonS3Config
        {
            ServiceURL = $"https://{_options.AccountId}.r2.cloudflarestorage.com",
            ForcePathStyle = true,
            // Cloudflare R2 requires this exact signing region. Do not set RegionEndpoint
            // (e.g. USEast1): R2 rejects any other region's credential scope as
            // "InvalidAccessKeyId" even for a valid key.
            AuthenticationRegion = "auto",
            // AWS SDK v4 adds CRC32 trailing checksums by default (aws-chunked
            // STREAMING-*-TRAILER body encoding), which Cloudflare R2 rejects.
            // Send checksums only when required => plain SigV4 body, which R2 accepts.
            RequestChecksumCalculation = Amazon.Runtime.RequestChecksumCalculation.WHEN_REQUIRED
        };

        _client = new AmazonS3Client(_options.AccessKeyId, _options.SecretAccessKey, config);
    }

    private void EnsureConfigured()
    {
        if (!_isConfigured || _client is null)
        {
            throw new InvalidOperationException(
                "Document uploads are temporarily disabled.");
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
                ContentType = contentType,
                // Cloudflare R2 does not implement aws-chunked streaming payloads
                // (STREAMING-AWS4-HMAC-SHA256-PAYLOAD[-TRAILER]). In AWS SDK v4 the
                // flag lives on the request itself: this sends UNSIGNED-PAYLOAD over
                // HTTPS (headers still fully SigV4-signed), which R2 accepts.
                DisablePayloadSigning = true
            };

            await _client!.PutObjectAsync(request, cancellationToken);
            var publicUrl = GetPublicUrl(key);

            _logger.LogInformation("Uploaded {Key} to R2", key);

            return publicUrl;
        }
        catch (AmazonS3Exception ex)
        {
            _logger.LogWarning(ex, "R2 upload failed for {Key} (status {StatusCode})", key, ex.StatusCode);
            throw new InvalidOperationException("Document uploads are temporarily unavailable. Please try again later.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "R2 upload failed for {Key}", key);
            throw new InvalidOperationException("Document uploads are temporarily unavailable. Please try again later.");
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
        catch (AmazonS3Exception ex)
        {
            _logger.LogWarning(ex, "R2 delete failed for {Key} (status {StatusCode})", key, ex.StatusCode);
            throw new InvalidOperationException("Document deletion is temporarily unavailable.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "R2 delete failed for {Key}", key);
            throw new InvalidOperationException("Document deletion is temporarily unavailable.");
        }
    }

    public string GetPublicUrl(string key)
    {
        EnsureConfigured();
        return $"{_options.PublicBaseUrl.TrimEnd('/')}/{key}";
    }
}