using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Boots the real application (Program.cs) with an in-memory database for
/// integration tests. Each factory instance gets its own isolated in-memory
/// store so parallel test classes don't interfere.
/// </summary>
public class ProductionApiFactory : WebApplicationFactory<Program>
{
    // Each test class gets its own factory instance, and therefore its own
    // dedicated in-memory database. This prevents integration test classes
    // (which may run in parallel) from truncating and re-seeding a shared
    // database underneath one another.
    public string TestDatabaseName { get; } = $"cebu_upskilling_test_{Guid.NewGuid():N}";

    /// <summary>
    /// Kept for backwards-compatibility; now returns an in-memory identifier
    /// rather than a Postgres connection string.
    /// </summary>
    public string TestConnectionString => $"InMemory:{TestDatabaseName}";

    /// <summary>
    /// When false (the default), rate limiting is disabled for integration tests so
    /// the shared limit does not interfere with normal request volumes. Derived
    /// factories can opt back in (e.g. to assert 429 behaviour) by setting this true.
    /// </summary>
    public bool EnableRateLimiting { get; set; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Jwt:Key", "test-signing-key-that-is-at-least-32-characters-long");
        builder.UseSetting("Jwt:Issuer", "CebuUpskilling");
        builder.UseSetting("Jwt:Audience", "CebuUpskillingClient");
        builder.UseSetting("RateLimiting:Enabled", EnableRateLimiting ? "true" : "false");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            // Program.cs switches to UseInMemoryDatabase when the connection
            // string starts with "InMemory:".
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = TestConnectionString,
            });
        });

        builder.ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.AddConsole();
                });

        // Tests must not log: swap in a blank logger so nothing is written to
        // the Console/File sinks configured in appsettings.json for production.
        // Registering NullLoggerFactory after Program.cs wins over Serilog.
        builder.ConfigureServices(services =>
        {
            services.AddSingleton<ILoggerFactory>(_ => NullLoggerFactory.Instance);

            // The media endpoint talks to R2 storage; tests must not require R2
            // credentials, so swap in an in-memory fake.
            services.AddScoped<IObjectStorageService, FakeObjectStorageService>();

            // Resume/assessment skill parsing talks to the Google Gemini API; tests
            // must not depend on network access or API credentials, so swap in a
            // deterministic local fake. Remove the typed-client registration added
            // by Program.cs first so the fake wins resolution.
            var googleAiDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IGoogleAiService));
            if (googleAiDescriptor != null)
                services.Remove(googleAiDescriptor);
            services.AddScoped<IGoogleAiService, FakeGoogleAiService>();
        });
    }

    public async Task EnsureMigratedAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.EnsureCreatedAsync();
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        // In-memory provider has no TRUNCATE/CASCADE — recreate the store.
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();
    }

    public ApplicationDbContext CreateDbContext()
    {
        var scope = Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    }
}
