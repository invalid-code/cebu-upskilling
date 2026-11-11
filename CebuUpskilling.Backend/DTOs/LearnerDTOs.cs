namespace CebuUpskilling.Backend.DTOs;

public record LearnerSummaryDto(
    Guid LearnerId,
    bool IsPremium,
    LearnerUserSummaryDto User
);

public record LearnerUserSummaryDto(
    Guid UserId,
    string FirstName,
    string LastName,
    string? MiddleName,
    string Role,
    string? TargetRole,
    bool RemoteFriendly
);