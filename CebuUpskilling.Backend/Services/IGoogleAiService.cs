using CebuUpskilling.Backend.DTOs;

namespace CebuUpskilling.Backend.Services;

public interface IGoogleAiService
{
    Task<List<string>> ParseSkillsFromResumeAsync(string resumeText, CancellationToken ct = default);
    Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(string skillName, int count = 5, CancellationToken ct = default);
    Task<List<CandidateRanking>> RankCandidatesAsync(string jobTitle, string targetRole, string? requirements, List<CandidateSkillProfile> candidates, CancellationToken ct = default);
    Task<DraftJobPostResponse?> DraftJobPostAsync(DraftJobPostRequest request, CancellationToken ct = default);
}
