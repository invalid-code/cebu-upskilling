using CebuUpskilling.Backend.Options;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Tests;

[Trait("Category", "ExternalIntegration")]
public class GoogleAiLiveTests
{
    private static readonly string[] KnownSkills = new[]
    {
        "JavaScript", "TypeScript", "React", "CSS", "HTML", "Node.js",
        "Python", "SQL", "Git", "REST APIs", "Vue.js", "Angular", "Docker", "AWS", "Figma",
    };

    private static GoogleAiService CreateService()
    {
        var options = new GoogleAiOptions
        {
            ApiKey = ExternalIntegrationSettings.GoogleAiApiKey!,
            Model = Environment.GetEnvironmentVariable("GoogleAi__Model") ?? "gemini-3.5-flash",
            BaseUrl = Environment.GetEnvironmentVariable("GoogleAi__BaseUrl") ?? "https://generativelanguage.googleapis.com/v1beta",
        };

        var baseUrl = options.BaseUrl.EndsWith('/') ? options.BaseUrl : options.BaseUrl + "/";
        var client = new HttpClient { BaseAddress = new Uri(baseUrl), Timeout = TimeSpan.FromSeconds(60) };
        return new GoogleAiService(client, Microsoft.Extensions.Options.Options.Create(options), NullLogger<GoogleAiService>.Instance);
    }

    [LiveExternalIntegrationFact]
    public async Task ParseSkillsFromResumeAsync_RealApi_ReturnsKnownSkillsFromResume()
    {
        const string resume =
            "Experience building single-page applications with JavaScript and React. " +
            "Used Git for version control and REST APIs for backend integration.";

        var skills = await CreateService().ParseSkillsFromResumeAsync(resume);

        Assert.NotEmpty(skills);
        Assert.All(skills, skill => Assert.Contains(skill, KnownSkills));
        Assert.Contains("JavaScript", skills);
        Assert.Contains("React", skills);
    }

    [LiveExternalIntegrationFact]
    public async Task GenerateAssessmentQuestionsAsync_RealApi_ReturnsValidQuestions()
    {
        var questions = await CreateService().GenerateAssessmentQuestionsAsync("JavaScript", count: 5);

        Assert.Equal(5, questions.Count);
        Assert.All(questions, q =>
        {
            Assert.False(string.IsNullOrWhiteSpace(q.Text));
            Assert.False(string.IsNullOrWhiteSpace(q.OptionA));
            Assert.False(string.IsNullOrWhiteSpace(q.OptionB));
            Assert.False(string.IsNullOrWhiteSpace(q.OptionC));
            Assert.False(string.IsNullOrWhiteSpace(q.OptionD));
            Assert.InRange(q.CorrectOption, 0, 3);
        });
    }
}
