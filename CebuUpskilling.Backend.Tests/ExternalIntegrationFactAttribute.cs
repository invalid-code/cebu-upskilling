using Xunit.Abstractions;
using Xunit.Sdk;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Marks a test that exercises an external integration (Google AI, R2, ...).
/// These tests are skipped unless the RUN_EXTERNAL_INTEGRATION_TESTS
/// environment variable is set to "1" or "true".
/// </summary>
[XunitTestCaseDiscoverer("CebuUpskilling.Backend.Tests.ExternalIntegrationFactDiscoverer", "CebuUpskilling.Backend.Tests")]
[AttributeUsage(AttributeTargets.Method)]
public sealed class ExternalIntegrationFactAttribute : FactAttribute
{
}

public sealed class ExternalIntegrationFactDiscoverer : IXunitTestCaseDiscoverer
{
    private readonly IMessageSink _diagnosticMessageSink;

    public ExternalIntegrationFactDiscoverer(IMessageSink diagnosticMessageSink)
        => _diagnosticMessageSink = diagnosticMessageSink;

    public IEnumerable<IXunitTestCase> Discover(ITestFrameworkDiscoveryOptions discoveryOptions, ITestMethod testMethod, IAttributeInfo factAttribute)
        => new[]
        {
            new ExternalIntegrationTestCase(
                _diagnosticMessageSink,
                discoveryOptions.MethodDisplayOrDefault(),
                discoveryOptions.MethodDisplayOptionsOrDefault(),
                testMethod),
        };
}

public class ExternalIntegrationTestCase : XunitTestCase
{
    [Obsolete("Called by the de-serializer; should only be called by deriving classes for de-serialization purposes", true)]
    public ExternalIntegrationTestCase() { }

    public ExternalIntegrationTestCase(
        IMessageSink diagnosticMessageSink,
        TestMethodDisplay defaultMethodDisplay,
        TestMethodDisplayOptions defaultMethodDisplayOptions,
        ITestMethod testMethod)
        : base(diagnosticMessageSink, defaultMethodDisplay, defaultMethodDisplayOptions, testMethod, null)
    {
    }

    protected override string GetSkipReason(IAttributeInfo factAttribute)
    {
        if (!ExternalIntegrationSettings.IsEnabled)
            return "External integration tests are disabled. Set the RUN_EXTERNAL_INTEGRATION_TESTS environment variable to 1 or true to enable them.";

        return factAttribute is null ? string.Empty : base.GetSkipReason(factAttribute);
    }
}

internal static class ExternalIntegrationSettings
{
    public static bool IsEnabled { get; } =
        Environment.GetEnvironmentVariable("RUN_EXTERNAL_INTEGRATION_TESTS") is { } value
        && (value == "1" || value.Equals("true", StringComparison.OrdinalIgnoreCase));

    public static string? GoogleAiApiKey { get; } = Environment.GetEnvironmentVariable("GoogleAi__ApiKey");
}

/// <summary>
/// Marks a test that calls a real external service (e.g. the Gemini API)
/// and asserts on the actual response. These tests are skipped unless
/// RUN_EXTERNAL_INTEGRATION_TESTS is enabled AND the Google AI API key is set
/// via the GoogleAi__ApiKey environment variable.
/// </summary>
[XunitTestCaseDiscoverer("CebuUpskilling.Backend.Tests.LiveExternalIntegrationFactDiscoverer", "CebuUpskilling.Backend.Tests")]
[AttributeUsage(AttributeTargets.Method)]
public sealed class LiveExternalIntegrationFactAttribute : FactAttribute
{
}

public sealed class LiveExternalIntegrationFactDiscoverer : IXunitTestCaseDiscoverer
{
    private readonly IMessageSink _diagnosticMessageSink;

    public LiveExternalIntegrationFactDiscoverer(IMessageSink diagnosticMessageSink)
        => _diagnosticMessageSink = diagnosticMessageSink;

    public IEnumerable<IXunitTestCase> Discover(ITestFrameworkDiscoveryOptions discoveryOptions, ITestMethod testMethod, IAttributeInfo factAttribute)
        => new[]
        {
            new LiveExternalIntegrationTestCase(
                _diagnosticMessageSink,
                discoveryOptions.MethodDisplayOrDefault(),
                discoveryOptions.MethodDisplayOptionsOrDefault(),
                testMethod),
        };
}

public sealed class LiveExternalIntegrationTestCase : ExternalIntegrationTestCase
{
    [Obsolete("Called by the de-serializer; should only be called by deriving classes for de-serialization purposes", true)]
    public LiveExternalIntegrationTestCase() { }

    public LiveExternalIntegrationTestCase(
        IMessageSink diagnosticMessageSink,
        TestMethodDisplay defaultMethodDisplay,
        TestMethodDisplayOptions defaultMethodDisplayOptions,
        ITestMethod testMethod)
        : base(diagnosticMessageSink, defaultMethodDisplay, defaultMethodDisplayOptions, testMethod)
    {
    }

    protected override string GetSkipReason(IAttributeInfo factAttribute)
    {
        if (!ExternalIntegrationSettings.IsEnabled)
            return "External integration tests are disabled. Set the RUN_EXTERNAL_INTEGRATION_TESTS environment variable to 1 or true to enable them.";

        if (string.IsNullOrWhiteSpace(ExternalIntegrationSettings.GoogleAiApiKey))
            return "Google AI API key not set. Set the GoogleAi__ApiKey environment variable to run live Google AI tests.";

        return factAttribute is null ? string.Empty : base.GetSkipReason(factAttribute);
    }
}
