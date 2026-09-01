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

        // Tests now run against the EF Core in-memory provider
        // (ProductionApiFactory uses UseInMemoryDatabase), so Postgres is not
        // required. Keep the attribute as a no-op so existing
        // [RequiresPostgresFact] annotations continue to run.
        return string.Empty;
    }
}

internal static class PostgresAvailability
{
    public static bool IsAvailable => true;
    public static string ConnectionString => "InMemory";
}
