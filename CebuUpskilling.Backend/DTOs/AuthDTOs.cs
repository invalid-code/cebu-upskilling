namespace CebuUpskilling.Backend.DTOs;

using System.ComponentModel.DataAnnotations;

public record RegisterRequest(
    [Required] string FirstName,
    [Required] string LastName,
    string? MiddleName,
    string? Birthday,
    [Required] string EmailAddress,
    [Required, MinLength(6)] string Password,
    string Role = "Learner",
    string? TargetRole = null,
    string? Address = null,
    string? Resume = null
);

public record CompanyRegisterRequest(
    [Required] string CompanyName,
    [Required] string FirstName,
    [Required] string LastName,
    string? MiddleName,
    string? Birthday,
    [Required] string EmailAddress,
    [Required, MinLength(6)] string Password,
    string? Address = null
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
    string? Street,
    string? City,
    string? Province,
    string? ZipCode,
    string? Country,
    bool RemoteFriendly,
    string Token,
    int ParsedSkillCount = 0,
    int AssessmentCount = 0,
    int? CompanyId = null,
    string? CompanyName = null
);

public record CompanyRegisterResponse(
    int UserId,
    string FirstName,
    string LastName,
    string EmailAddress,
    string Role,
    int CompanyId,
    string CompanyName,
    string Token
);

public record EmailRequest(
    [Required] string Email
);

public record ConfirmEmailRequest(
    [Required] string Email,
    [Required] string Token
);

public record ResetPasswordRequest(
    [Required] string Email,
    [Required] string Token,
    [Required, MinLength(6)] string NewPassword
);
