using System.Threading.Channels;

namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Resume skill parsing (Gemini) is slow — seconds per registration — so
/// <see cref="AuthService"/> only enqueues the work and returns immediately.
/// A <see cref="ResumeParseWorker"/> processes jobs in the background with
/// its own scope: a slow or failing parse can never block registration.
/// </summary>
public record ResumeParseJob(int UserId, string ResumeText);

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
                using var scope = _scopes.CreateScope();
                var agent = scope.ServiceProvider.GetRequiredService<IJobseekerSkillParserAgent>();

                var result = await agent.ParseAndCreateAssessmentsAsync(job.UserId, job.ResumeText, stoppingToken);
                _logger.LogInformation("Background-parsed {Count} skills for user {UserId}",
                    result.Skills.Count, job.UserId);

                // Pre-generate questions so opening an assessment is instant.
                foreach (var skill in result.Skills.Take(MaxPregeneratedSkills))
                    await agent.EnsureQuestionsForSkillAsync(skill.SkillId, stoppingToken);
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
}
