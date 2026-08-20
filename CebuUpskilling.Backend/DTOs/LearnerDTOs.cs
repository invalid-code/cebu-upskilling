namespace CebuUpskilling.Backend.DTOs;

public record LearnerSummaryDto(
    int LearnerId,
    bool IsPremium,
    LearnerUserSummaryDto User
);

public record LearnerUserSummaryDto(
    int UserId,
    string FirstName,
    string LastName,
    string? MiddleName,
    string Role,
    string? TargetRole,
    bool RemoteFriendly
);