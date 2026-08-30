using System.Net;
using System.Text;
using System.Text.Json;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Options;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class GoogleAiCourseGenerationTests
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

    private static GoogleAiService CreateService(StubHttpMessageHandler handler, Action<GoogleAiOptions>? configure = null)
    {
        var options = new GoogleAiOptions
        {
            ApiKey = "test-api-key",
            Model = "test-model",
            BaseUrl = "https://generativelanguage.googleapis.com/v1beta",
        };
        configure?.Invoke(options);
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://generativelanguage.googleapis.com/v1beta/") };
        return new GoogleAiService(client, Microsoft.Extensions.Options.Options.Create(options), NullLogger<GoogleAiService>.Instance);
    }

    private static HttpResponseMessage GenerateContentResponse(string content)
    {
        var json = $"{{\"candidates\":[{{\"content\":{{\"parts\":[{{\"text\":{JsonSerializer.Serialize(content)}}}]}}}}]}}";
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
    }

    private static string ValidCourseJson(
        string name = "Intro to Customer Support",
        string description = "Foundational course",
        int technicalLevel = 2,
        string mode = "Online",
        string rationale = "Fits the brief")
    {
        return $$"""
            {
              "name": "{{name}}",
              "description": "{{description}}",
              "technicalLevel": {{technicalLevel}},
              "mode": "{{mode}}",
              "rationale": "{{rationale}}",
              "modules": [
                { "name": "Module 1", "description": "First module", "order": 0, "lessons": [ { "name": "Lesson 1", "description": "Outcome", "order": 0 }, { "name": "Lesson 2", "description": "", "order": 1 } ] },
                { "name": "Module 2", "description": null, "order": 1, "lessons": [ { "name": "Lesson 3", "description": "Outcome 3", "order": 0 } ] }
              ],
              "matchedSkills": [ { "name": "Communication" } ]
            }
            """;
    }

    private static CourseGenerationPromptContext Context(string brief = "We want a course for junior support agents")
        => new(
            Brief: brief,
            TechnicalLevel: 2,
            Mode: "Online",
            ModuleCount: 2,
            LessonsPerModule: 2,
            AvailableSkills: new List<CourseGenerationAvailableSkill>
            {
                new(1, "Communication", "Soft"),
                new(2, "React", "Frontend"),
            });

    [Fact]
    public async Task GenerateCourseOutlineAsync_ReturnsDraft_WithModulesAndMatchedSkills()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => GenerateContentResponse(ValidCourseJson()) };
        var service = CreateService(handler);

        var result = await service.GenerateCourseOutlineAsync(Context());

        Assert.NotNull(result);
        Assert.Equal("Intro to Customer Support", result!.Name);
        Assert.Equal(2, result.TechnicalLevel);
        Assert.Equal("Online", result.Mode);
        Assert.Equal(2, result.Modules.Count);
        Assert.Equal("Module 1", result.Modules[0].Name);
        Assert.Equal(2, result.Modules[0].Lessons.Count);
        Assert.Single(result.MatchedSkills);
        Assert.Equal("Communication", result.MatchedSkills[0].Name);
        Assert.Equal(1, handler.CallCount);
    }

    [Fact]
    public async Task GenerateCourseOutlineAsync_FiltersUnknownSkills()
    {
        var json = ValidCourseJson().Replace("Communication", "UnknownSkill");
        var handler = new StubHttpMessageHandler { Responder = _ => GenerateContentResponse(json) };
        var service = CreateService(handler);

        var result = await service.GenerateCourseOutlineAsync(Context());

        Assert.NotNull(result);
        Assert.Empty(result!.MatchedSkills);
    }

    [Fact]
    public async Task GenerateCourseOutlineAsync_NormalizesMode_FallbackToRequest()
    {
        var json = ValidCourseJson(mode: "Garbage");
        var handler = new StubHttpMessageHandler { Responder = _ => GenerateContentResponse(json) };
        var service = CreateService(handler);

        var result = await service.GenerateCourseOutlineAsync(Context());

        Assert.NotNull(result);
        Assert.Equal("Online", result!.Mode);
    }

    [Fact]
    public async Task GenerateCourseOutlineAsync_EmptyModules_ReturnsNull()
    {
        var json = """{"name":"Empty","description":"","technicalLevel":2,"mode":"Online","rationale":"","modules":[],"matchedSkills":[]}""";
        var handler = new StubHttpMessageHandler { Responder = _ => GenerateContentResponse(json) };
        var service = CreateService(handler);

        var result = await service.GenerateCourseOutlineAsync(Context());

        Assert.Null(result);
    }

    [Fact]
    public async Task GenerateCourseOutlineAsync_NonJson_ReturnsNull()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => GenerateContentResponse("not json") };
        var service = CreateService(handler);

        var result = await service.GenerateCourseOutlineAsync(Context());

        Assert.Null(result);
    }

    [Fact]
    public async Task GenerateCourseOutlineAsync_MissingApiKey_ReturnsNull_WithoutHttpCall()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => GenerateContentResponse(ValidCourseJson()) };
        var service = CreateService(handler, o => o.ApiKey = "");

        var result = await service.GenerateCourseOutlineAsync(Context());

        Assert.Null(result);
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task GenerateCourseOutlineAsync_EmptyBrief_ReturnsNull_WithoutHttpCall()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => GenerateContentResponse(ValidCourseJson()) };
        var service = CreateService(handler);

        var result = await service.GenerateCourseOutlineAsync(Context(brief: "   "));

        Assert.Null(result);
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task GenerateCourseOutlineAsync_ApiError_ReturnsNull()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => new HttpResponseMessage(HttpStatusCode.InternalServerError) };
        var service = CreateService(handler);

        var result = await service.GenerateCourseOutlineAsync(Context());

        Assert.Null(result);
    }

    [Fact]
    public async Task GenerateCourseOutlineAsync_Prompt_ContainsBriefAndSkillCatalog()
    {
        var handler = new StubHttpMessageHandler { Responder = _ => GenerateContentResponse(ValidCourseJson()) };
        var service = CreateService(handler);

        await service.GenerateCourseOutlineAsync(Context(brief: "Our brief: hospitality onboarding"));

        var body = JsonDocument.Parse(handler.RequestBody!).RootElement;
        var prompt = body.GetProperty("contents")[0].GetProperty("parts")[0].GetProperty("text").GetString();
        Assert.Contains("hospitality onboarding", prompt);
        Assert.Contains("Communication", prompt);
        Assert.Contains("React", prompt);
    }
}
