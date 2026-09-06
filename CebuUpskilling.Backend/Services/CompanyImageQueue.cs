using System.Threading.Channels;

namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Company logo/cover uploads go to R2, which is slow — so controllers only
/// validate, buffer, and enqueue, returning 202 immediately. A
/// <see cref="CompanyImageWorker"/> uploads in the background and links the
/// URL to the company profile.
/// </summary>
public enum CompanyImageKind
{
    Logo,
    Cover,
}

public record CompanyImageJob(int UserId, CompanyImageKind Kind, byte[] FileBytes, string FileName);

public interface ICompanyImageQueue
{
    void Enqueue(CompanyImageJob job);
    ChannelReader<CompanyImageJob> Reader { get; }
}

public class CompanyImageQueue : ICompanyImageQueue
{
    private readonly Channel<CompanyImageJob> _channel = Channel.CreateUnbounded<CompanyImageJob>();

    public void Enqueue(CompanyImageJob job)
    {
        if (!_channel.Writer.TryWrite(job))
            throw new InvalidOperationException("Company image queue is unavailable");
    }

    public ChannelReader<CompanyImageJob> Reader => _channel.Reader;
}

public class CompanyImageWorker : BackgroundService
{
    private readonly ICompanyImageQueue _queue;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<CompanyImageWorker> _logger;

    public CompanyImageWorker(
        ICompanyImageQueue queue,
        IServiceScopeFactory scopes,
        ILogger<CompanyImageWorker> logger)
    {
        _queue = queue;
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await ProcessJobAsync(job, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Background company image upload failed for user {UserId}", job.UserId);
            }
        }
    }

    /// <summary>
    /// Processes one job. Public so integration tests can drive the background
    /// pipeline deterministically (the hosted worker itself is disabled in
    /// test hosts).
    /// </summary>
    public async Task<string?> ProcessJobAsync(CompanyImageJob job, CancellationToken ct)
    {
        using var scope = _scopes.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ICompanyService>();

        var url = job.Kind == CompanyImageKind.Logo
            ? await service.UploadLogoBytesAsync(job.UserId, job.FileBytes, job.FileName, ct)
            : await service.UploadCoverBytesAsync(job.UserId, job.FileBytes, job.FileName, ct);

        _logger.LogInformation("Background-uploaded company {Kind} for user {UserId}", job.Kind, job.UserId);
        return url;
    }
}
