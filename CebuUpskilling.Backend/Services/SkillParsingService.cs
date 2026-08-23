using CebuUpskilling.Backend.DTOs;

namespace CebuUpskilling.Backend.Services;

public interface ISkillParsingService
{
    Task<ParseSkillsResult> ParseAndCreateAssessmentsAsync(int userId, string resumeText, CancellationToken ct = default);
}
