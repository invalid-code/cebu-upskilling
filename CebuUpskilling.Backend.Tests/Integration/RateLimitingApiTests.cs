using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Exercises the rate limiting middleware with deliberately tiny permit limits.
/// The shared <see cref="ProductionApiFactory"/> disables rate limiting, so this
/// fixture re-enables it with limits small enough to trip within a single test.
/// </summary>
public class RateLimitedApiFactory : ProductionApiFactory
{
    public RateLimitedApiFactory()
    {
        EnableRateLimiting = true;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("RateLimiting:Global:PermitLimit", "3");
        builder.UseSetting("RateLimiting:Global:WindowSeconds", "60");
        builder.UseSetting("RateLimiting:Auth:PermitLimit", "2");
        builder.UseSetting("RateLimiting:Auth:WindowSeconds", "60");
    }
}

public class RateLimitingApiTests : IClassFixture<RateLimitedApiFactory>, IAsyncLifetime
{
    private readonly RateLimitedApiFactory _factory;
    private readonly HttpClient _client;

    public RateLimitingApiTests(RateLimitedApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        await _factory.EnsureMigratedAsync();
        await _factory.ResetDatabaseAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GlobalLimiter_Returns429AfterLimitExceeded()
    {
        // Pin a stable client IP via the forwarded header (the same header a reverse
        // proxy sets in production) so the limiter bucket is shared across requests.
        _client.DefaultRequestHeaders.Add("X-Forwarded-For", "203.0.113.10");

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 6; i++)
        {
            statuses.Add((await _client.GetAsync("/health")).StatusCode);
        }

        Assert.Contains(HttpStatusCode.OK, statuses);
        Assert.Contains(HttpStatusCode.TooManyRequests, statuses);
        // 429s must only appear after the permit budget is exhausted (i.e. after an OK).
        Assert.True(statuses.LastIndexOf(HttpStatusCode.OK) < statuses.IndexOf(HttpStatusCode.TooManyRequests));
    }

    [Fact]
    public async Task AuthPolicy_Returns429OnLoginAfterLimitExceeded()
    {
        _client.DefaultRequestHeaders.Add("X-Forwarded-For", "203.0.113.20");

        var body = JsonContent.Create(new { emailAddress = "x@y.com", password = "whatever" });

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 5; i++)
        {
            statuses.Add((await _client.PostAsync("/api/auth/login", body)).StatusCode);
        }

        Assert.Contains(HttpStatusCode.TooManyRequests, statuses);
        // At least one request must get through to the endpoint (auth rejects it, not the limiter).
        Assert.Contains(HttpStatusCode.Unauthorized, statuses);
    }
}
