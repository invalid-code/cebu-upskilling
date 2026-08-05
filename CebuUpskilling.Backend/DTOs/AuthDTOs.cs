namespace CebuUpskilling.Backend.DTOs;

public record RegisterRequest(
    string FirstName,
    string LastName,
    string? MiddleName,
    DateTime? Birthday,
    string EmailAddress,
    string Password,
    string Role = "Learner"
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
    string Token
);
