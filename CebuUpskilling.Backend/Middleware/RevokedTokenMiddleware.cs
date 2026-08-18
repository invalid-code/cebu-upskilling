using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Http;
using CebuUpskilling.Backend.Services;

namespace CebuUpskilling.Backend.Middleware;

/// <summary>
/// Rejects requests whose JWT has been revoked via logout. Runs after authentication
/// so the caller's claims (including the JTI) are available.
/// </summary>
public class RevokedTokenMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ITokenRevocationStore _revocationStore;

    public RevokedTokenMiddleware(RequestDelegate next, ITokenRevocationStore revocationStore)
    {
        _next = next;
        _revocationStore = revocationStore;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var jti = context.User?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value
                  ?? context.User?.FindFirst("jti")?.Value;

        if (!string.IsNullOrEmpty(jti) && _revocationStore.IsRevoked(jti))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Token has been revoked. Please log in again." });
            return;
        }

        await _next(context);
    }
}
