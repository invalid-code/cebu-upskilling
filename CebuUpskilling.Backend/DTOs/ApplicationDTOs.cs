namespace CebuUpskilling.Backend.DTOs;

public record ApplicationSummary(
    Guid PostId,
    string Title,
    string Company,
    string? TargetRole,
    string Status,
    DateTime AppliedAt,
    DateTime? SavedAt,
    string? ResumeUrl,
    string? CoverLetterUrl,
    string Schedule = "Full-time"
);

public record ApplyRequest(Guid PostId, string? ResumeUrl = null, string? CoverLetterUrl = null);

public record UpdateApplicationStatusRequest(string Status);

public record EmployerUpdateApplicationStatusRequest(string Status);

public record ApplicationEmployerSummary(
    Guid ApplicationId,
    Guid PostId,
    string PostTitle,
    Guid LearnerId,
    string LearnerName,
    string? LearnerEmail,
    string Status,
    DateTime AppliedAt,
    string? ResumeUrl,
    string? CoverLetterUrl
);

public record ApplicantSkillDto(string Name, int CurrentLevel, bool Verified);

public record ApplicationEmployerDetailDto(
    Guid ApplicationId,
    Guid PostId,
    string PostTitle,
    Guid LearnerId,
    string LearnerName,
    string? LearnerEmail,
    string? TargetRole,
    string Status,
    DateTime AppliedAt,
    string? ResumeUrl,
    string? CoverLetterUrl,
    List<ApplicantSkillDto> Skills
);
