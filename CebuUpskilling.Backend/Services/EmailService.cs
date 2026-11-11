namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Abstraction over an email sender. The default implementation logs the message;
/// swap in a real SMTP/SendGrid implementation in production via DI.
/// </summary>
public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default);
}

public class LoggingEmailService : IEmailService
{
    private readonly ILogger<LoggingEmailService> _logger;
    private readonly bool _logBody;

    public LoggingEmailService(ILogger<LoggingEmailService> logger, IHostEnvironment environment)
        : this(logger, environment.IsDevelopment())
    {
    }

    public LoggingEmailService(ILogger<LoggingEmailService> logger)
        : this(logger, logBody: false)
    {
    }

    internal LoggingEmailService(ILogger<LoggingEmailService> logger, bool logBody)
    {
        _logger = logger;
        _logBody = logBody;
    }

    public Task SendEmailAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        // The body of password-reset and email-confirmation messages contains a live
        // single-use token. Serilog ships the file sink with 30-day retention, so
        // logging it outside Development would leave account-takeover material on disk.
        if (_logBody)
        {
            _logger.LogInformation(
                "EMAIL (not actually sent in this environment){NewLine}To: {To}{NewLine}Subject: {Subject}{NewLine}{Body}",
                Environment.NewLine, to, Environment.NewLine, subject, Environment.NewLine, htmlBody);
        }
        else
        {
            _logger.LogInformation(
                "EMAIL (not actually sent in this environment) to {To}, subject {Subject}, {BodyLength} chars (body withheld: may contain a reset/confirmation token)",
                to, subject, htmlBody?.Length ?? 0);
        }

        return Task.CompletedTask;
    }
}
