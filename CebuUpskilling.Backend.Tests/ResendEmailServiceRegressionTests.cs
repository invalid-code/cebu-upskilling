using System.Net;
using System.Text.Json;
using CebuUpskilling.Backend.Options;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Regression coverage for <see cref="ResendEmailService"/> which previously
/// reported 0% line-rate. Exercises no-op when ApiKey missing, success,
/// failure throwing, and authorization header/payload.
/// </summary>
public class ResendEmailServiceRegressionTests
{
    private sealed class CapturingHandler : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }
        public string? LastBody { get; private set; }
        public HttpResponseMessage Response { get; set; } = new(HttpStatusCode.OK) { Content = new StringContent("{}") };

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            if (request.Content != null)
                LastBody = await request.Content.ReadAsStringAsync(cancellationToken);
            return Response;
        }
    }

    private static ResendEmailService CreateService(CapturingHandler handler, string apiKey, string from = "no-reply@example.com")
    {
        var options = Microsoft.Extensions.Options.Options.Create(new EmailOptions { ApiKey = apiKey, From = from });
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.resend.com/") };
        return new ResendEmailService(httpClient, options, NullLogger<ResendEmailService>.Instance);
    }

    [Fact]
    public async Task SendEmailAsync_EmptyApiKey_SkipsHttpCall()
    {
        var handler = new CapturingHandler();
        var service = CreateService(handler, apiKey: "");

        await service.SendEmailAsync("to@example.com", "Subject", "<p>hi</p>");

        Assert.Null(handler.LastRequest);
    }

    [Theory]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task SendEmailAsync_WhitespaceOrNullApiKey_SkipsHttpCall(string? key)
    {
        var handler = new CapturingHandler();
        var service = CreateService(handler, apiKey: key!);

        await service.SendEmailAsync("to@example.com", "Subject", "<p>hi</p>");

        Assert.Null(handler.LastRequest);
    }

    [Fact]
    public async Task SendEmailAsync_WithApiKey_SendsPayloadAndHeader()
    {
        var handler = new CapturingHandler { Response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") } };
        var service = CreateService(handler, apiKey: "re_test_key", from: "Cebu <no-reply@example.com>");

        await service.SendEmailAsync("to@example.com", "Hello", "<p>body</p>");

        Assert.NotNull(handler.LastRequest);
        Assert.Equal("Bearer", handler.LastRequest!.Headers.Authorization?.Scheme);
        Assert.Equal("re_test_key", handler.LastRequest.Headers.Authorization?.Parameter);
        Assert.NotNull(handler.LastBody);
        var doc = JsonDocument.Parse(handler.LastBody!);
        Assert.Equal("Cebu <no-reply@example.com>", doc.RootElement.GetProperty("from").GetString());
        Assert.Equal("to@example.com", doc.RootElement.GetProperty("to")[0].GetString());
        Assert.Equal("Hello", doc.RootElement.GetProperty("subject").GetString());
        Assert.Equal("<p>body</p>", doc.RootElement.GetProperty("html").GetString());
        Assert.Equal("emails", handler.LastRequest.RequestUri!.ToString().Split('/').Last());
    }

    [Fact]
    public async Task SendEmailAsync_NonSuccess_ThrowsInvalidOperation()
    {
        var handler = new CapturingHandler { Response = new HttpResponseMessage(HttpStatusCode.BadRequest) { Content = new StringContent("{\"error\":\"bad\"}") } };
        var service = CreateService(handler, apiKey: "re_test_key");

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.SendEmailAsync("to@example.com", "Subject", "<p>hi</p>"));
        Assert.Contains("Failed to send email", ex.Message);
        Assert.Contains("BadRequest", ex.Message);
    }

    [Fact]
    public async Task SendEmailAsync_Success_DoesNotThrow()
    {
        var handler = new CapturingHandler { Response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"id\":\"123\"}") } };
        var service = CreateService(handler, apiKey: "re_test_key");

        var ex = await Record.ExceptionAsync(() => service.SendEmailAsync("to@example.com", "Subject", "<p>hi</p>"));
        Assert.Null(ex);
    }

    [Fact]
    public async Task SendEmailAsync_PassesCancellationToken()
    {
        var handler = new CapturingHandler { Response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") } };
        var service = CreateService(handler, apiKey: "key");
        using var cts = new CancellationTokenSource();
        await service.SendEmailAsync("to@example.com", "S", "H", cts.Token);
        Assert.NotNull(handler.LastRequest);
    }
}
