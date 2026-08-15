using System.Text;
using System.Text.Json;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Options;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Services;

public class GoogleAiService : IGoogleAiService
{
    private readonly HttpClient _httpClient;
    private readonly GoogleAiOptions _options;
    private readonly ILogger<GoogleAiService> _logger;

    private static readonly JsonSerializerOptions QuestionJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public GoogleAiService(HttpClient httpClient, IOptions<GoogleAiOptions> options, ILogger<GoogleAiService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<List<string>> ParseSkillsFromResumeAsync(string resumeText, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey) || string.IsNullOrWhiteSpace(resumeText))
        {
            _logger.LogDebug("Gemini API key or resume text is empty; skipping skill parsing");
            return new List<string>();
        }

        var prompt = $"""
            Extract skills from the provided resume text.

            Categories:
            - Programming languages
            - Frameworks
            - Libraries
            - Tools
            - Technologies
            - Professional skills

            Format requirements:
            - Standard, recognizable names (e.g. "JavaScript" not "JS").

            Output format:
            - JSON array of strings, nothing else.

            Example:
            Resume: "Frontend developer with 5+ years building React apps. Skilled in JavaScript, TypeScript, HTML, CSS, Git and REST APIs."
            Output: ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Git", "REST APIs"]

            Resume:
            {resumeText}
            """;

        var messageContent = await SendPromptAsync(prompt, ct);
        if (string.IsNullOrWhiteSpace(messageContent))
            return new List<string>();

        try
        {
            var rawSkillNames = JsonSerializer.Deserialize<List<string>>(ExtractJsonArray(messageContent)) ?? new List<string>();

            var skillNames = rawSkillNames
                .Select(name => name?.Trim())
                .Where(name => !string.IsNullOrWhiteSpace(name) && name.Length <= 100)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Select(name => name!)
                .ToList();

            _logger.LogInformation("Parsed {Count} skills from resume: {Skills}", skillNames.Count, string.Join(", ", skillNames));
            return skillNames;
        }
        catch (JsonException)
        {
            _logger.LogWarning("Gemini returned non-JSON skill parse output; returning empty result");
            return new List<string>();
        }
    }

    public async Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(string skillName, int count = 5, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey) || string.IsNullOrWhiteSpace(skillName))
        {
            _logger.LogDebug("Gemini API key or skill name is empty; skipping question generation");
            return new List<GeneratedAssessmentQuestion>();
        }

        var prompt = $"Create {count} targeted multiple-choice questions to verify a candidate's proficiency in {skillName}. Each question must have exactly 4 plausible options with exactly one correct answer. CorrectOption is the 0-based index of the correct option (0-3). Vary difficulty from fundamental to advanced so a strong candidate scores well and a weak one does not. Return ONLY a JSON array, no other text, in this exact shape:\n[{{\"text\":\"...\",\"optionA\":\"...\",\"optionB\":\"...\",\"optionC\":\"...\",\"optionD\":\"...\",\"correctOption\":0}}]";

        var messageContent = await SendPromptAsync(prompt, ct);
        if (string.IsNullOrWhiteSpace(messageContent))
            return new List<GeneratedAssessmentQuestion>();

        try
        {
            var questions = JsonSerializer.Deserialize<List<GeneratedAssessmentQuestion>>(messageContent, QuestionJsonOptions);
            return questions?.Where(IsValid).Take(count).ToList() ?? new List<GeneratedAssessmentQuestion>();
        }
        catch (JsonException)
        {
            _logger.LogWarning("Gemini returned non-JSON question output for skill {Skill}; returning empty result", skillName);
            return new List<GeneratedAssessmentQuestion>();
        }
    }

    private async Task<string?> SendPromptAsync(string prompt, CancellationToken ct)
    {
        var request = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text = prompt } } },
            },
            generationConfig = new
            {
                responseMimeType = "application/json",
                temperature = 0,
            },
        };

        var json = JsonSerializer.Serialize(request);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        var url = $"{_options.BaseUrl.TrimEnd('/')}/models/{_options.Model}:generateContent?key={Uri.EscapeDataString(_options.ApiKey)}";

        try
        {
            var response = await _httpClient.PostAsync(url, content, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini API returned {StatusCode}: {Body}", response.StatusCode, await response.Content.ReadAsStringAsync(ct));
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(responseJson);

            if (!doc.RootElement.TryGetProperty("candidates", out var candidates)
                || candidates.GetArrayLength() == 0)
            {
                _logger.LogWarning("Gemini API returned no candidates");
                return null;
            }

            var parts = candidates[0].GetProperty("content").GetProperty("parts").EnumerateArray();
            var text = string.Concat(parts.Select(p => p.GetProperty("text").GetString()));
            return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call Gemini API");
            return null;
        }
    }

    private static bool IsValid(GeneratedAssessmentQuestion q)
        => !string.IsNullOrWhiteSpace(q.Text)
           && !string.IsNullOrWhiteSpace(q.OptionA)
           && !string.IsNullOrWhiteSpace(q.OptionB)
           && !string.IsNullOrWhiteSpace(q.OptionC)
           && !string.IsNullOrWhiteSpace(q.OptionD)
           && q.CorrectOption is >= 0 and <= 3;

    private static string ExtractJsonArray(string content)
    {
        const string fence = "```";

        var trimmed = content.Trim();

        if (trimmed.StartsWith(fence, StringComparison.Ordinal))
        {
            var end = trimmed.LastIndexOf(fence, StringComparison.Ordinal);
            if (end > fence.Length)
            {
                var start = trimmed.IndexOf('\n') + 1;
                trimmed = trimmed[start..end].Trim();
            }
        }

        return trimmed;
    }
}
