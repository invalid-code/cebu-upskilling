namespace CebuUpskilling.Backend.DTOs;

public record RegisterRequest(
    string FirstName,
    string LastName,
    string? MiddleName,
    DateTime? Birthday,
    string EmailAddress,
    string Password,
    string Role = "Learner",
    string? TargetRole = null
);

public record UpdateProfileRequest(
    string? TargetRole = null
);

public record LoginRequest(
    string EmailAddress,
    string Password
);

public record AuthResponse(
    int UserId,
    string FirstName,
    string LastName,
    string EmailAddress,
    string Role,
    string? TargetRole,
    string Token
);
