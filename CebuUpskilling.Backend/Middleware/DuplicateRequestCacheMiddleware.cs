using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using CebuUpskilling.Backend.Controllers;
using CebuUpskilling.Backend.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Middleware;

/// <summary>
/// Serves identical GET responses from a short-lived in-memory cache so
/// duplicate requests (double render, polling, retries) don't re-hit EF Core.
/// Runs after authorization so the authenticated user id is part of the key —
/// one user never sees another user's cached body.
/// Mutating requests (POST/PUT/PATCH/DELETE) invalidate that caller's GET entries.
/// </summary>
public class DuplicateRequestCacheMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private readonly IOptions<DuplicateRequestCacheOptions> _options;
    private readonly ILogger<DuplicateRequestCacheMiddleware> _logger;

    // Tracks inserted keys so a write can evict only the caller's entries
    // (IMemoryCache has no prefix scan).
    private readonly ConcurrentDictionary<string, byte> _trackedKeys = new();
    // Per-key gate so concurrent duplicates serialize: the first executes,
    // the rest re-check and serve HIT without re-running the controller.
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    private sealed record CachedEntry(int StatusCode, string? ContentType, byte[] Body);

    public DuplicateRequestCacheMiddleware(
        RequestDelegate next,
        IMemoryCache cache,
        IOptions<DuplicateRequestCacheOptions> options,
        ILogger<DuplicateRequestCacheMiddleware> logger)
    {
        _next = next;
        _cache = cache;
        _options = options;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var opts = _options.Value;
        if (!opts.Enabled)
        {
            await _next(context);
            return;
        }

        var path = context.Request.Path.Value ?? string.Empty;
        if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // Never cache auth flows; never cache health/openapi (also non-/api, guarded above).
        if (path.StartsWith("/api/auth/", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        if (HttpMethods.IsPost(context.Request.Method)
            || HttpMethods.IsPut(context.Request.Method)
            || HttpMethods.IsPatch(context.Request.Method)
            || HttpMethods.IsDelete(context.Request.Method))
        {
            await _next(context);
            InvalidateCallerEntries(context);
            return;
        }

        if (!HttpMethods.IsGet(context.Request.Method))
        {
            await _next(context);
            return;
        }

        // Explicit bypass from the caller (e.g. pull-to-refresh).
        var cacheControl = context.Request.Headers.CacheControl.ToString();
        if (cacheControl.Contains("no-cache", StringComparison.OrdinalIgnoreCase)
            || cacheControl.Contains("no-store", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        var key = BuildKey(context);
        if (_cache.TryGetValue<CachedEntry>(key, out var hit) && hit is not null)
        {
            context.Response.StatusCode = hit.StatusCode;
            if (hit.ContentType is not null)
                context.Response.ContentType = hit.ContentType;
            context.Response.Headers["X-Cache"] = "HIT";
            await context.Response.Body.WriteAsync(hit.Body);
            _logger.LogDebug("Duplicate cache HIT {Method} {Path}", context.Request.Method, path);
            return;
        }

        var gate = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(context.RequestAborted);
        try
        {
            // A concurrent duplicate may have populated while we waited.
            if (_cache.TryGetValue<CachedEntry>(key, out hit) && hit is not null)
            {
                context.Response.StatusCode = hit.StatusCode;
                if (hit.ContentType is not null)
                    context.Response.ContentType = hit.ContentType;
                context.Response.Headers["X-Cache"] = "HIT";
                await context.Response.Body.WriteAsync(hit.Body, context.RequestAborted);
                _logger.LogDebug("Duplicate cache HIT (coalesced) {Method} {Path}", context.Request.Method, path);
                return;
            }

            var originalBody = context.Response.Body;
            await using var buffer = new MemoryStream();
            context.Response.Body = buffer;
            try
            {
                await _next(context);
            }
            finally
            {
                context.Response.Body = originalBody;
            }

            var body = buffer.ToArray();
            var cacheable = context.Response.StatusCode == StatusCodes.Status200OK
                && body.Length > 0
                && body.Length <= opts.MaxCachedBodyBytes
                && (context.Response.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true)
                && !context.Response.Headers.ContainsKey("Set-Cookie")
                && !context.Response.HasStarted;

            if (cacheable)
            {
                var entry = new CachedEntry(
                    context.Response.StatusCode,
                    context.Response.ContentType,
                    body);
                _cache.Set(key, entry, TimeSpan.FromSeconds(Math.Max(1, opts.TtlSeconds)));
                _trackedKeys.TryAdd(key, 0);
                context.Response.Headers["X-Cache"] = "MISS";
                _logger.LogDebug("Duplicate cache MISS (stored) {Method} {Path}", context.Request.Method, path);
            }

            if (body.Length > 0)
                await originalBody.WriteAsync(body, context.RequestAborted);
        }
        finally
        {
            gate.Release();
            if (gate.CurrentCount == 1)
                _locks.TryRemove(KeyValuePair.Create(key, gate));
        }
    }

    private void InvalidateCallerEntries(HttpContext context)
    {
        var scope = IdentityScope(context);
        var prefix = $"dup:{scope}:GET:";
        foreach (var key in _trackedKeys.Keys)
        {
            if (key.StartsWith(prefix, StringComparison.Ordinal))
            {
                _cache.Remove(key);
                _trackedKeys.TryRemove(key, out _);
            }
        }
    }

    private static string IdentityScope(HttpContext context)
    {
        if (context.User.TryGetUserId(out var userId) && userId != Guid.Empty)
            return $"user:{userId:N}";
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return $"ip:{ip}";
    }

    private static string BuildKey(HttpContext context)
    {
        var scope = IdentityScope(context);
        var method = context.Request.Method.ToUpperInvariant();
        var path = (context.Request.Path.Value ?? string.Empty).ToLowerInvariant();

        var query = context.Request.Query;
        string queryHash;
        if (query.Count == 0)
        {
            queryHash = "noquery";
        }
        else
        {
            var sb = new StringBuilder();
            foreach (var kvp in query.OrderBy(k => k.Key, StringComparer.Ordinal))
            {
                sb.Append(kvp.Key.ToLowerInvariant());
                sb.Append('=');
                sb.Append(string.Join(",", kvp.Value.OrderBy(v => v, StringComparer.Ordinal)));
                sb.Append('&');
            }
            var raw = sb.ToString();
            queryHash = raw.Length <= 256 ? raw : Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
        }

        return $"dup:{scope}:{method}:{path}|{queryHash}";
    }
}
