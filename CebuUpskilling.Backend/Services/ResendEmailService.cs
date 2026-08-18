using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CebuUpskilling.Backend.Options;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Sends email through the Resend REST API (https://api.resend.com/emails).
/// Falls back to no-op logging if ApiKey is not configured (handled at registration time).
/// </summary>
public class ResendEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly EmailOptions _options;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(HttpClient httpClient, IOptions<EmailOptions> options, ILogger<ResendEmailService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendEmailAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogWarning("Email:ApiKey is not configured; skipping send to {To}", to);
            return;
        }

        var payload = new
        {
            from = _options.From,
            to = new[] { to },
            subject,
            html = htmlBody,
        };

        var json = JsonSerializer.Serialize(payload);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

        var response = await _httpClient.PostAsync("emails", content, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Resend email to {To} failed ({StatusCode}): {Body}", to, response.StatusCode, errorBody);
            throw new InvalidOperationException($"Failed to send email via Resend: {response.StatusCode}");
        }

        _logger.LogInformation("Email sent via Resend to {To} (subject: {Subject})", to, subject);
    }
}
