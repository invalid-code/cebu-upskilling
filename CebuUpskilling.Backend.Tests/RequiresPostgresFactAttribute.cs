using Npgsql;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Marks a test that requires a running PostgreSQL instance (Integration tests that
/// boot the real API via <see cref="Integration.ProductionApiFactory"/>). When Postgres
/// is not reachable the test is skipped instead of failing with
/// "Connection refused 127.0.0.1:5432", so <c>dotnet test</c> passes on machines
/// without Docker/Postgres (CI, local dev without compose).
/// Set RUN_POSTGRES_INTEGRATION_TESTS=1 or ensure Postgres is reachable to run them.
/// </summary>
[XunitTestCaseDiscoverer("CebuUpskilling.Backend.Tests.Integration.RequiresPostgresFactDiscoverer", "CebuUpskilling.Backend.Tests")]
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequiresPostgresFactAttribute : FactAttribute { }

public sealed class RequiresPostgresFactDiscoverer : IXunitTestCaseDiscoverer
{
    private readonly IMessageSink _diagnosticMessageSink;

    public RequiresPostgresFactDiscoverer(IMessageSink diagnosticMessageSink)
        => _diagnosticMessageSink = diagnosticMessageSink;

    public IEnumerable<IXunitTestCase> Discover(ITestFrameworkDiscoveryOptions discoveryOptions, ITestMethod testMethod, IAttributeInfo factAttribute)
        => new[]
        {
            new RequiresPostgresTestCase(
                _diagnosticMessageSink,
                discoveryOptions.MethodDisplayOrDefault(),
                discoveryOptions.MethodDisplayOptionsOrDefault(),
                testMethod),
        };
}

public class RequiresPostgresTestCase : XunitTestCase
{
    [Obsolete("Called by the de-serializer; should only be called by deriving classes for de-serialization purposes", true)]
    public RequiresPostgresTestCase() { }

    public RequiresPostgresTestCase(
        IMessageSink diagnosticMessageSink,
        TestMethodDisplay defaultMethodDisplay,
        TestMethodDisplayOptions defaultMethodDisplayOptions,
        ITestMethod testMethod)
        : base(diagnosticMessageSink, defaultMethodDisplay, defaultMethodDisplayOptions, testMethod) { }

    protected override string GetSkipReason(IAttributeInfo factAttribute)
    {
        var baseReason = factAttribute is null ? string.Empty : base.GetSkipReason(factAttribute);
        if (!string.IsNullOrEmpty(baseReason)) return baseReason;

        if (!PostgresAvailability.IsAvailable)
            return $"Postgres not available at {PostgresAvailability.ConnectionString} — skipping integration test. Start it with `docker compose up -d db` or set ConnectionStrings:DefaultConnection.";

        return string.Empty;
    }
}

internal static class PostgresAvailability
{
    private static readonly Lazy<(bool Available, string ConnectionString)> _cached = new(Probe);

    public static bool IsAvailable => _cached.Value.Available;
    public static string ConnectionString => _cached.Value.ConnectionString;

    private static (bool, string) Probe()
    {
        // Allow explicit opt-out/in via env var, mirroring ExternalIntegrationSettings.
        var env = Environment.GetEnvironmentVariable("RUN_POSTGRES_INTEGRATION_TESTS");
        if (env is not null && (env == "0" || env.Equals("false", StringComparison.OrdinalIgnoreCase)))
            return (false, ResolveConnectionString());

        var cs = ResolveConnectionString();
        try
        {
            using var conn = new NpgsqlConnection(cs);
            // Short timeout so discovery doesn't hang.
            conn.Open();
            conn.Close();
            return (true, cs);
        }
        catch (Exception ex)
        {
            // Cache the failure; xunit will surface it as Skip reason, not failure.
            System.Diagnostics.Debug.WriteLine($"Postgres probe failed for {cs}: {ex.Message}");
            return (false, cs);
        }
    }

    private static string ResolveConnectionString()
    {
        // Mirror ProductionApiFactory fallback logic.
        var fromConfig = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings:DefaultConnection");
        if (!string.IsNullOrWhiteSpace(fromConfig)) return fromConfig;

        // Try appsettings via builder fallback same as factory: Host=localhost;Port=5432;Database=cebu_upskilling;Username=postgres
        return "Host=localhost;Port=5432;Database=cebu_upskilling;Username=postgres;Password=postgres;Timeout=2;CommandTimeout=2";
    }
}
