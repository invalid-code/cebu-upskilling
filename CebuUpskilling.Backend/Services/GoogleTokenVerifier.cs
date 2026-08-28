using CebuUpskilling.Backend.Options;
using Google.Apis.Auth;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Services;

public record GoogleUserInfo(
    string Subject,
    string Email,
    string FirstName,
    string LastName);

public interface IGoogleTokenVerifier
{
    /// <summary>
    /// Validates a Google-issued ID token (signature, expiry, audience) and returns
    /// the authenticated user's profile. Throws UnauthorizedAccessException when the
    /// token is invalid, expired, issued for another client, or carries an
    /// unverified email.
    /// </summary>
    Task<GoogleUserInfo> VerifyIdTokenAsync(string idToken);
}

public class GoogleTokenVerifier : IGoogleTokenVerifier
{
    private readonly GoogleOAuthOptions _options;
    private readonly ILogger<GoogleTokenVerifier> _logger;

    public GoogleTokenVerifier(IOptions<GoogleOAuthOptions> options, ILogger<GoogleTokenVerifier> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<GoogleUserInfo> VerifyIdTokenAsync(string idToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ClientId))
        {
            throw new InvalidOperationException(
                "Google sign-in is not configured. Set GoogleOAuth:ClientId in appsettings.json or the GoogleOAuth__ClientId environment variable.");
        }

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _options.ClientId }
            });

            if (payload.EmailVerified != true)
            {
                _logger.LogWarning("Google ID token rejected: email {Email} is not verified", payload.Email);
                throw new UnauthorizedAccessException("Google account email is not verified");
            }

            return new GoogleUserInfo(payload.Subject, payload.Email, payload.GivenName ?? string.Empty, payload.FamilyName ?? string.Empty);
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning("Google ID token validation failed: {Reason}", ex.Message);
            throw new UnauthorizedAccessException("Invalid Google credential", ex);
        }
    }
}
