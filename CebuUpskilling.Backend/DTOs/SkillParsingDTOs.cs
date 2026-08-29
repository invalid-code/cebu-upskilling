namespace CebuUpskilling.Backend.DTOs;

// ---------------------------------------------------------------------
// Employer hiring agent (AI candidate ranking / job-post drafting /
// screening question generation)
// ---------------------------------------------------------------------

/// <summary>Compact per-candidate profile sent to Gemini for ranking (no PII beyond an opaque id).</summary>
public record CandidateSkillProfile(
    int ApplicationId,
    List<string> Skills
);

/// <summary>One ranked candidate as returned by the AI model.</summary>
public record CandidateRanking(
    int ApplicationId,
    double Score,
    string Rationale
);

public record RankedCandidateDto(
    int ApplicationId,
    int LearnerId,
    string LearnerName,
    string Status,
    DateTime AppliedAt,
    double Score,
    string Rationale,
    List<string> Skills
);

public record RankCandidatesResponse(
    int PostId,
    bool AiRanked,
    List<RankedCandidateDto> Candidates
);

public record DraftJobPostRequest(
    string Title,
    string TargetRole,
    string? JobType,
    string? ExperienceLevel,
    string? Location,
    string? Notes
);

public record DraftJobPostResponse(
    string Description,
    string Requirements,
    string Benefits,
    List<string> SuggestedSkills
);

public record ScreeningQuestionsResponse(
    int PostId,
    List<CreatedCompanyQuestionResponse> Questions
);

public record ParseSkillsRequest(string? ResumeText);

public record ParsedSkillResult(
    string SkillName,
    int SkillId,
    int? AssessmentId
);

public record ParseSkillsResult(
    IReadOnlyList<ParsedSkillResult> Skills
);
