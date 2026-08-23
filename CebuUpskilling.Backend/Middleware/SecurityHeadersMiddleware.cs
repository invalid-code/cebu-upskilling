namespace CebuUpskilling.Backend.Middleware;

/// <summary>
/// Adds defence-in-depth security headers to every response.
/// Runs early so even error responses carry the headers.
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // Mitigate MIME sniffing
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        // Clickjacking protection – API has no frames
        context.Response.Headers["X-Frame-Options"] = "DENY";
        // Referrer leakage – never send referrer to other origins
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        // Minimal CSP for API – no scripts needed; allow self only
        context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'";
        // Permissions – disable powerful browser features
        context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        // HSTS – only over HTTPS; 1 year, include subdomains
        if (context.Request.IsHttps)
        {
            context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
        }

        await _next(context);
    }
}
