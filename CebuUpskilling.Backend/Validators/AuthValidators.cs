using CebuUpskilling.Backend.DTOs;
using FluentValidation;

namespace CebuUpskilling.Backend.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required")
            .MaximumLength(255).WithMessage("First name must not exceed 255 characters");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required")
            .MaximumLength(255).WithMessage("Last name must not exceed 255 characters");

        RuleFor(x => x.MiddleName)
            .MaximumLength(255).WithMessage("Middle name must not exceed 255 characters")
            .When(x => x.MiddleName != null);

        RuleFor(x => x.EmailAddress)
            .NotEmpty().WithMessage("Email address is required")
            .EmailAddress().WithMessage("A valid email address is required")
            .MaximumLength(255).WithMessage("Email address must not exceed 255 characters");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required")
            .MinimumLength(6).WithMessage("Password must be at least 6 characters")
            .MaximumLength(100).WithMessage("Password must not exceed 100 characters");

        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Role is required")
            .Must(r => r == "Learner" || r == "Recruiter" || r == "CourseProvider")
            .WithMessage("Role must be 'Learner', 'Recruiter' or 'CourseProvider'");

        RuleFor(x => x.TargetRole)
            .MaximumLength(100).WithMessage("Target role must not exceed 100 characters")
            .When(x => x.TargetRole != null);

        RuleFor(x => x.Address)
            .MaximumLength(255).WithMessage("Address must not exceed 255 characters")
            .When(x => x.Address != null);

        RuleFor(x => x.Birthday)
            .Must(BeAValidPastDate).WithMessage("Birthday must be a valid date in the past")
            .When(x => x.Birthday != null);
    }

    private static bool BeAValidPastDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return true;

        return DateTime.TryParse(value, out var parsed) && parsed <= DateTime.UtcNow;
    }
}

public class CompanyRegisterRequestValidator : AbstractValidator<CompanyRegisterRequest>
{
    public CompanyRegisterRequestValidator()
    {
        RuleFor(x => x.CompanyName)
            .NotEmpty().WithMessage("Company name is required")
            .MinimumLength(2).WithMessage("Company name must be at least 2 characters")
            .MaximumLength(255).WithMessage("Company name must not exceed 255 characters");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required")
            .MaximumLength(255).WithMessage("First name must not exceed 255 characters");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required")
            .MaximumLength(255).WithMessage("Last name must not exceed 255 characters");

        RuleFor(x => x.MiddleName)
            .MaximumLength(255).WithMessage("Middle name must not exceed 255 characters")
            .When(x => x.MiddleName != null);

        RuleFor(x => x.EmailAddress)
            .NotEmpty().WithMessage("Email address is required")
            .EmailAddress().WithMessage("A valid email address is required")
            .MaximumLength(255).WithMessage("Email address must not exceed 255 characters");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required")
            .MinimumLength(6).WithMessage("Password must be at least 6 characters")
            .MaximumLength(100).WithMessage("Password must not exceed 100 characters");

        RuleFor(x => x.Address)
            .MaximumLength(255).WithMessage("Address must not exceed 255 characters")
            .When(x => x.Address != null);

        RuleFor(x => x.CompanyDescription)
            .MaximumLength(2000).WithMessage("Company description must not exceed 2000 characters")
            .When(x => x.CompanyDescription != null);

        RuleFor(x => x.CompanyIndustry)
            .MaximumLength(100).WithMessage("Company industry must not exceed 100 characters")
            .When(x => x.CompanyIndustry != null);

        RuleFor(x => x.CompanyWebsite)
            .MaximumLength(255).WithMessage("Company website must not exceed 255 characters")
            .Must(CompanyFieldRules.IsValidWebsite).WithMessage("Company website must be a valid http(s) URL")
            .When(x => x.CompanyWebsite != null);

        RuleFor(x => x.CompanyLocation)
            .MaximumLength(255).WithMessage("Company location must not exceed 255 characters")
            .When(x => x.CompanyLocation != null);

        RuleFor(x => x.CompanySize)
            .Must(CompanyFieldRules.IsAllowedSize)
            .WithMessage($"Company size must be one of: {string.Join(", ", CompanyFieldRules.AllowedSizes)}")
            .When(x => x.CompanySize != null);

        RuleFor(x => x.Birthday)
            .Must(BeAValidPastDate).WithMessage("Birthday must be a valid date in the past")
            .When(x => x.Birthday != null);
    }

    private static bool BeAValidPastDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return true;

        return DateTime.TryParse(value, out var parsed) && parsed <= DateTime.UtcNow;
    }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.EmailAddress)
            .NotEmpty().WithMessage("Email address is required")
            .EmailAddress().WithMessage("A valid email address is required");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required");
    }
}

public class GoogleAuthRequestValidator : AbstractValidator<GoogleAuthRequest>
{
    public GoogleAuthRequestValidator()
    {
        RuleFor(x => x.IdToken)
            .NotEmpty().WithMessage("Google ID token is required");

        RuleFor(x => x.Role)
            .Must(r => r == null || r == "Learner" || r == "Recruiter" || r == "CourseProvider")
            .WithMessage("Role must be 'Learner', 'Recruiter' or 'CourseProvider'")
            .When(x => x.Role != null);
    }
}

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.TargetRole)
            .MaximumLength(100).WithMessage("Target role must not exceed 100 characters")
            .When(x => x.TargetRole != null);

        RuleFor(x => x.Address)
            .MaximumLength(255).WithMessage("Address must not exceed 255 characters")
            .When(x => x.Address != null);
    }
}