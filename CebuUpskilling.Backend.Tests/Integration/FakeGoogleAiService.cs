using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Deterministic stand-in for the Google Gemini AI service so integration
/// tests do not depend on network access or API credentials. Skills are parsed
/// locally from a small known vocabulary present in the resume text.
/// </summary>
public class FakeGoogleAiService : IGoogleAiService
{
    private static readonly HashSet<string> KnownSkills = new(StringComparer.OrdinalIgnoreCase)
    {
        "JavaScript", "TypeScript", "React", "CSS", "HTML", "Node.js", "Python",
        "SQL", "Git", "REST APIs", "Vue.js", "Angular", "Docker", "AWS", "Figma",
    };

    public Task<List<string>> ParseSkillsFromResumeAsync(string resumeText, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(resumeText))
            return Task.FromResult(new List<string>());

        var found = KnownSkills
            .Where(skill => resumeText.Contains(skill, StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Task.FromResult(found);
    }

    public Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(
        string skillName, int count = 5, CancellationToken ct = default)
        => Task.FromResult(new List<GeneratedAssessmentQuestion>());

    public Task<List<CandidateRanking>> RankCandidatesAsync(
        string jobTitle, string targetRole, string? requirements, List<CandidateSkillProfile> candidates, CancellationToken ct = default)
        => Task.FromResult(new List<CandidateRanking>());

    public Task<DraftJobPostResponse?> DraftJobPostAsync(DraftJobPostRequest request, CancellationToken ct = default)
        => Task.FromResult<DraftJobPostResponse?>(null);

    public Task<CourseGenerationResult?> GenerateCourseOutlineAsync(CourseGenerationPromptContext context, CancellationToken ct = default)
        => Task.FromResult<CourseGenerationResult?>(null);
}
