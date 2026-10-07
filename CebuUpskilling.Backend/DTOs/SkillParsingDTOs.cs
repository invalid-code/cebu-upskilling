namespace CebuUpskilling.Backend.DTOs;

// ---------------------------------------------------------------------
// Employer hiring agent (AI candidate ranking / job-post drafting /
// screening question generation)
// ---------------------------------------------------------------------

/// <summary>Compact per-candidate profile sent to Gemini for ranking (no PII beyond an opaque id).</summary>
public record CandidateSkillProfile(
    Guid ApplicationId,
    List<string> Skills
);

/// <summary>One ranked candidate as returned by the AI model.</summary>
public record CandidateRanking(
    Guid ApplicationId,
    double Score,
    string Rationale
);

public record RankedCandidateDto(
    Guid ApplicationId,
    Guid LearnerId,
    string LearnerName,
    string Status,
    DateTime AppliedAt,
    double Score,
    string Rationale,
    List<string> Skills
);

public record RankCandidatesResponse(
    Guid PostId,
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
    Guid PostId,
    List<CreatedCompanyQuestionResponse> Questions
);

/// <summary>Create a job post from a target role's skill profile.
/// Parameter order mirrors <see cref="DraftJobPostRequest"/> (title first).</summary>
public record CreateJobPostFromRoleRequest(
    string? Title,
    string TargetRole,
    string? Location,
    string? JobType,
    string? ExperienceLevel,
    string? SalaryRange,
    bool IsRemote = false
);

public record CreateJobPostFromRoleResponse(
    PostResponse Post,
    bool AiDrafted
);

public record ParsedSkillResult(
    string SkillName,
    Guid SkillId,
    Guid? AssessmentId
);

public record ParseSkillsResult(
    IReadOnlyList<ParsedSkillResult> Skills
);
