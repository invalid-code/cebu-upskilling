using System.Threading.Channels;
using CebuUpskilling.Backend.Data;

namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Resume skill parsing (Gemini) and the resume R2 upload are slow — seconds
/// per registration — so <see cref="AuthService"/> only buffers the file,
/// enqueues the work, and returns immediately. A <see cref="ResumeParseWorker"/>
/// processes jobs in the background with its own scope: slow or failing
/// uploads/parses can never block registration.
/// </summary>
public record ResumeParseJob(int UserId, string ResumeText, byte[]? FileBytes, string? FileName);

public interface IResumeParseQueue
{
    void Enqueue(ResumeParseJob job);
    ChannelReader<ResumeParseJob> Reader { get; }
}

public class ResumeParseQueue : IResumeParseQueue
{
    private readonly Channel<ResumeParseJob> _channel = Channel.CreateUnbounded<ResumeParseJob>();

    public void Enqueue(ResumeParseJob job)
    {
        if (!_channel.Writer.TryWrite(job))
            throw new InvalidOperationException("Resume parse queue is unavailable");
    }

    public ChannelReader<ResumeParseJob> Reader => _channel.Reader;
}

public class ResumeParseWorker : BackgroundService
{
    private const int MaxPregeneratedSkills = 5;

    private readonly IResumeParseQueue _queue;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<ResumeParseWorker> _logger;

    public ResumeParseWorker(
        IResumeParseQueue queue,
        IServiceScopeFactory scopes,
        ILogger<ResumeParseWorker> logger)
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
                _logger.LogWarning(ex, "Background resume parsing failed for user {UserId}", job.UserId);
            }
        }
    }

    /// <summary>
    /// Processes one job: upload the resume first so a parse failure can never
    /// lose it, then parse/pre-generate in its own guarded step. Each stage
    /// fails independently with its own log entry.
    /// </summary>
    public async Task ProcessJobAsync(ResumeParseJob job, CancellationToken ct)
    {
        using var scope = _scopes.CreateScope();
        var services = scope.ServiceProvider;

        if (job.FileBytes is { Length: > 0 } && !string.IsNullOrWhiteSpace(job.FileName))
        {
            try
            {
                var resumeService = services.GetRequiredService<IResumeService>();
                var db = services.GetRequiredService<ApplicationDbContext>();
                var url = await resumeService.UploadBytesAsync(job.FileBytes, job.FileName, ct);
                var user = await db.Users.FindAsync(new object[] { job.UserId }, ct);
                if (user != null)
                {
                    user.ResumeUrl = url;
                    await db.SaveChangesAsync(ct);
                    _logger.LogInformation("Background-uploaded resume for user {UserId}", job.UserId);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Background resume upload failed for user {UserId}", job.UserId);
            }
        }

        try
        {
            var agent = services.GetRequiredService<IJobseekerSkillParserAgent>();

            var result = await agent.ParseAndCreateAssessmentsAsync(job.UserId, job.ResumeText, ct);
            _logger.LogInformation("Background-parsed {Count} skills for user {UserId}",
                result.Skills.Count, job.UserId);

            // Pre-generate questions so opening an assessment is instant.
            foreach (var skill in result.Skills.Take(MaxPregeneratedSkills))
                await agent.EnsureQuestionsForSkillAsync(skill.SkillId, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Background resume parsing failed for user {UserId}", job.UserId);
        }
    }
}
