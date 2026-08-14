using System.Net;
using System.Text;
using System.Text.Json;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Options;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Tests;

[Trait("Category", "ExternalIntegration")]
public class OpenRouterServiceTests
{
    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        public Func<HttpRequestMessage, HttpResponseMessage>? Responder { get; set; }
        public HttpRequestMessage? LastRequest { get; private set; }
        public string? RequestBody { get; private set; }
        public int CallCount { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            CallCount++;
            if (request.Content != null)
                RequestBody = await request.Content.ReadAsStringAsync(cancellationToken);
            if (Responder is null)
                throw new InvalidOperationException("Responder not configured");
            return Responder(request);
        }
    }

    private static OpenRouterService CreateService(StubHttpMessageHandler handler, Action<OpenRouterOptions>? configure = null)
    {
        var options = new OpenRouterOptions
        {
            ApiKey = "test-api-key",
            Model = "test-model",
            BaseUrl = "https://openrouter.ai/api/v1",
            AppUrl = "https://example.com",
            AppName = "Test App",
        };
        configure?.Invoke(options);

        var client = new HttpClient(handler) { BaseAddress = new Uri("https://openrouter.ai/api/v1/") };
        return new OpenRouterService(client, Microsoft.Extensions.Options.Options.Create(options), NullLogger<OpenRouterService>.Instance);
    }

    private static HttpResponseMessage ChatResponse(string content)
    {
        var json = $"{{\"choices\":[{{\"message\":{{\"content\":{JsonSerializer.Serialize(content)}}}}}]}}";
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
    }

    private static HttpResponseMessage QuestionsResponse(string questionsJson)
        => ChatResponse(questionsJson);

    private static string QuestionJson(string text, int correctOption)
        => $"{{\"text\":\"{text}\",\"optionA\":\"A\",\"optionB\":\"B\",\"optionC\":\"C\",\"optionD\":\"D\",\"correctOption\":{correctOption}}}";

    private static string RequestBody(StubHttpMessageHandler handler)
        => handler.RequestBody!;

    // ------------------------------------------------------------------ //
    // Request construction
    // ------------------------------------------------------------------ //

    [ExternalIntegrationFact]
    public async Task ParseSkillsFromResumeAsync_SendsChatCompletionRequest_WithBearerAuthAndPrompt()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => ChatResponse("[\"JavaScript\",\"React\"]") };
        var service = CreateService(handler);

        var skills = await service.ParseSkillsFromResumeAsync("I am a React developer.");

        Assert.Equal(new[] { "JavaScript", "React" }, skills);
        Assert.Equal(1, handler.CallCount);
        Assert.Equal(HttpMethod.Post, handler.LastRequest!.Method);
        Assert.EndsWith("/chat/completions", handler.LastRequest.RequestUri!.AbsolutePath);
        Assert.Equal("Bearer", handler.LastRequest.Headers.Authorization!.Scheme);
        Assert.Equal("test-api-key", handler.LastRequest.Headers.Authorization.Parameter);
        Assert.Equal("https://example.com", Assert.Single(handler.LastRequest.Headers.GetValues("HTTP-Referer")));
        Assert.Equal("Test App", Assert.Single(handler.LastRequest.Headers.GetValues("X-Title")));

        var body = JsonDocument.Parse(RequestBody(handler)).RootElement;
        Assert.Equal("test-model", body.GetProperty("model").GetString());
        var prompt = body.GetProperty("messages")[0].GetProperty("content").GetString();
        Assert.Contains("React", prompt);
        Assert.Contains("I am a React developer.", prompt);
    }

    [ExternalIntegrationFact]
    public async Task GenerateAssessmentQuestionsAsync_SendsRequest_ContainingSkillAndCount()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => QuestionsResponse($"[{QuestionJson("Q1", 0)}]") };
        var service = CreateService(handler);

        await service.GenerateAssessmentQuestionsAsync("Docker", count: 3);

        var body = JsonDocument.Parse(RequestBody(handler)).RootElement;
        var prompt = body.GetProperty("messages")[0].GetProperty("content").GetString();
        Assert.Contains("Docker", prompt);
        Assert.Contains("3", prompt);
    }

    // ------------------------------------------------------------------ //
    // Skill parsing
    // ------------------------------------------------------------------ //

    [ExternalIntegrationFact]
    public async Task ParseSkillsFromResumeAsync_DeduplicatesAndFiltersToKnownSkills()
    {
        var handler = new StubHttpMessageHandler
        {
            Responder = _ => ChatResponse("[\"JavaScript\",\"react\",\"React\",\"  JavaScript  \",\"NonsenseSkill\"]"),
        };
        var service = CreateService(handler);

        var skills = await service.ParseSkillsFromResumeAsync("resume");

        Assert.Equal(new[] { "JavaScript", "React" }, skills);
    }

    [ExternalIntegrationFact]
    public async Task ParseSkillsFromResumeAsync_NonJsonOutput_ReturnsEmpty()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => ChatResponse("this is not json") };
        var service = CreateService(handler);

        var skills = await service.ParseSkillsFromResumeAsync("resume");

        Assert.Empty(skills);
    }

    [ExternalIntegrationFact]
    public async Task ParseSkillsFromResumeAsync_ApiError_ReturnsEmpty()
    {
        var handler = new StubHttpMessageHandler
        {
            Responder = _ => new HttpResponseMessage(HttpStatusCode.InternalServerError),
        };
        var service = CreateService(handler);

        var skills = await service.ParseSkillsFromResumeAsync("resume");

        Assert.Empty(skills);
        Assert.Equal(1, handler.CallCount);
    }

    [ExternalIntegrationFact]
    public async Task ParseSkillsFromResumeAsync_HttpRequestFailure_ReturnsEmpty()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => throw new HttpRequestException("connection refused") };
        var service = CreateService(handler);

        var skills = await service.ParseSkillsFromResumeAsync("resume");

        Assert.Empty(skills);
    }

    [ExternalIntegrationFact]
    public async Task ParseSkillsFromResumeAsync_MissingApiKey_ReturnsEmpty_WithoutHttpCall()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => ChatResponse("[\"JavaScript\"]") };
        var service = CreateService(handler, options => options.ApiKey = string.Empty);

        var skills = await service.ParseSkillsFromResumeAsync("resume");

        Assert.Empty(skills);
        Assert.Equal(0, handler.CallCount);
    }

    [ExternalIntegrationFact]
    public async Task ParseSkillsFromResumeAsync_EmptyResume_ReturnsEmpty_WithoutHttpCall()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => ChatResponse("[\"JavaScript\"]") };
        var service = CreateService(handler);

        var skills = await service.ParseSkillsFromResumeAsync("   ");

        Assert.Empty(skills);
        Assert.Equal(0, handler.CallCount);
    }

    // ------------------------------------------------------------------ //
    // Question generation
    // ------------------------------------------------------------------ //

    [ExternalIntegrationFact]
    public async Task GenerateAssessmentQuestionsAsync_ReturnsValidQuestions()
    {
        var handler = new StubHttpMessageHandler
        {
            Responder = _ => QuestionsResponse($"[{QuestionJson("Q1", 1)}, {QuestionJson("Q2", 3)}]"),
        };
        var service = CreateService(handler);

        var questions = await service.GenerateAssessmentQuestionsAsync("SQL");

        Assert.Equal(2, questions.Count);
        Assert.Equal("Q1", questions[0].Text);
        Assert.Equal(1, questions[0].CorrectOption);
        Assert.Equal("Q2", questions[1].Text);
        Assert.Equal(3, questions[1].CorrectOption);
    }

    [ExternalIntegrationFact]
    public async Task GenerateAssessmentQuestionsAsync_InvalidQuestions_AreFiltered()
    {
        var handler = new StubHttpMessageHandler
        {
            Responder = _ => QuestionsResponse($"[{QuestionJson("Q1", 0)}, {QuestionJson("Q2", 9)}, {{\"text\":\"\",\"optionA\":\"A\",\"optionB\":\"B\",\"optionC\":\"C\",\"optionD\":\"D\",\"correctOption\":0}}]"),
        };
        var service = CreateService(handler);

        var questions = await service.GenerateAssessmentQuestionsAsync("SQL");

        Assert.Single(questions);
        Assert.Equal("Q1", questions[0].Text);
    }

    [ExternalIntegrationFact]
    public async Task GenerateAssessmentQuestionsAsync_IsLimitedToRequestedCount()
    {
        var handler = new StubHttpMessageHandler
        {
            Responder = _ => QuestionsResponse($"[{QuestionJson("Q1", 0)}, {QuestionJson("Q2", 0)}, {QuestionJson("Q3", 0)}]"),
        };
        var service = CreateService(handler);

        var questions = await service.GenerateAssessmentQuestionsAsync("SQL", count: 2);

        Assert.Equal(2, questions.Count);
    }

    [ExternalIntegrationFact]
    public async Task GenerateAssessmentQuestionsAsync_NonJsonOutput_ReturnsEmpty()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => ChatResponse("not an array") };
        var service = CreateService(handler);

        var questions = await service.GenerateAssessmentQuestionsAsync("SQL");

        Assert.Empty(questions);
    }

    [ExternalIntegrationFact]
    public async Task GenerateAssessmentQuestionsAsync_MissingApiKey_ReturnsEmpty_WithoutHttpCall()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => QuestionsResponse($"[{QuestionJson("Q1", 0)}]") };
        var service = CreateService(handler, options => options.ApiKey = string.Empty);

        var questions = await service.GenerateAssessmentQuestionsAsync("SQL");

        Assert.Empty(questions);
        Assert.Equal(0, handler.CallCount);
    }
}
