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

    public LoggingEmailService(ILogger<LoggingEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendEmailAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "EMAIL (not actually sent in this environment){NewLine}To: {To}{NewLine}Subject: {Subject}{NewLine}{Body}",
            Environment.NewLine, to, Environment.NewLine, subject, Environment.NewLine, htmlBody);
        return Task.CompletedTask;
    }
}
