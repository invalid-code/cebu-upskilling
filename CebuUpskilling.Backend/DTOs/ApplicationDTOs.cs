namespace CebuUpskilling.Backend.DTOs;

public record ApplicationSummary(
    int PostId,
    string Title,
    string Company,
    string? TargetRole,
    string Status,
    DateTime AppliedAt,
    DateTime? SavedAt,
    string? ResumeUrl,
    string? CoverLetterUrl
);

public record ApplyRequest(int PostId, string? ResumeUrl = null, string? CoverLetterUrl = null);

public record UpdateApplicationStatusRequest(string Status);

public record EmployerUpdateApplicationStatusRequest(string Status);

public record ApplicationEmployerSummary(
    int ApplicationId,
    int PostId,
    string PostTitle,
    int LearnerId,
    string LearnerName,
    string? LearnerEmail,
    string Status,
    DateTime AppliedAt,
    string? ResumeUrl,
    string? CoverLetterUrl
);

public record ApplicantSkillDto(string Name, int CurrentLevel, bool Verified);

public record ApplicationEmployerDetailDto(
    int ApplicationId,
    int PostId,
    string PostTitle,
    int LearnerId,
    string LearnerName,
    string? LearnerEmail,
    string? TargetRole,
    string Status,
    DateTime AppliedAt,
    string? ResumeUrl,
    string? CoverLetterUrl,
    List<ApplicantSkillDto> Skills
);