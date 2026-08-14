namespace CebuUpskilling.Backend.DTOs;

using System.ComponentModel.DataAnnotations;

public record RegisterRequest(
    [Required] string FirstName,
    [Required] string LastName,
    string? MiddleName,
    DateTime? Birthday,
    [Required] string EmailAddress,
    [Required, MinLength(6)] string Password,
    string Role = "Learner",
    string? TargetRole = null,
    string? Address = null,
    string? Resume = null
);

public record UpdateProfileRequest(
    string? TargetRole = null,
    string? Address = null,
    bool? RemoteFriendly = null
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
    string? Address,
    bool RemoteFriendly,
    string Token
);
