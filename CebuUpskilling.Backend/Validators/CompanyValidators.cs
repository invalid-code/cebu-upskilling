using CebuUpskilling.Backend.DTOs;
using FluentValidation;

namespace CebuUpskilling.Backend.Validators;

public static class CompanyFieldRules
{
    public static readonly string[] AllowedSizes = ["1-10", "11-50", "51-200", "201+"];

    public static bool IsAllowedSize(string? value)
        => string.IsNullOrWhiteSpace(value) || AllowedSizes.Contains(value.Trim());

    public static bool IsValidWebsite(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return true;

        return Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}

public class CreateCompanyRequestValidator : AbstractValidator<CreateCompanyRequest>
{
    public CreateCompanyRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Company name is required")
            .MinimumLength(2).WithMessage("Company name must be at least 2 characters")
            .MaximumLength(255).WithMessage("Company name must not exceed 255 characters");

        RuleFor(x => x.Tagline)
            .MaximumLength(160).WithMessage("Tagline must not exceed 160 characters")
            .When(x => x.Tagline != null);

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters")
            .When(x => x.Description != null);

        RuleFor(x => x.Industry)
            .MaximumLength(100).WithMessage("Industry must not exceed 100 characters")
            .When(x => x.Industry != null);

        RuleFor(x => x.Website)
            .MaximumLength(255).WithMessage("Website must not exceed 255 characters")
            .Must(CompanyFieldRules.IsValidWebsite).WithMessage("Website must be a valid http(s) URL")
            .When(x => x.Website != null);

        RuleFor(x => x.LinkedInUrl)
            .MaximumLength(255).WithMessage("LinkedIn URL must not exceed 255 characters")
            .Must(CompanyFieldRules.IsValidWebsite).WithMessage("LinkedIn URL must be a valid http(s) URL")
            .When(x => x.LinkedInUrl != null);

        RuleFor(x => x.FacebookUrl)
            .MaximumLength(255).WithMessage("Facebook URL must not exceed 255 characters")
            .Must(CompanyFieldRules.IsValidWebsite).WithMessage("Facebook URL must be a valid http(s) URL")
            .When(x => x.FacebookUrl != null);

        RuleFor(x => x.Location)
            .MaximumLength(255).WithMessage("Location must not exceed 255 characters")
            .When(x => x.Location != null);

        RuleFor(x => x.CompanySize)
            .Must(CompanyFieldRules.IsAllowedSize)
            .WithMessage($"Company size must be one of: {string.Join(", ", CompanyFieldRules.AllowedSizes)}")
            .When(x => x.CompanySize != null);
    }
}

public class UpdateCompanyRequestValidator : AbstractValidator<UpdateCompanyRequest>
{
    public UpdateCompanyRequestValidator()
    {
        RuleFor(x => x.Name)
            .MinimumLength(2).WithMessage("Company name must be at least 2 characters")
            .MaximumLength(255).WithMessage("Company name must not exceed 255 characters")
            .When(x => x.Name != null);

        RuleFor(x => x.Tagline)
            .MaximumLength(160).WithMessage("Tagline must not exceed 160 characters")
            .When(x => x.Tagline != null);

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters")
            .When(x => x.Description != null);

        RuleFor(x => x.Industry)
            .MaximumLength(100).WithMessage("Industry must not exceed 100 characters")
            .When(x => x.Industry != null);

        RuleFor(x => x.Website)
            .MaximumLength(255).WithMessage("Website must not exceed 255 characters")
            .Must(CompanyFieldRules.IsValidWebsite).WithMessage("Website must be a valid http(s) URL")
            .When(x => x.Website != null);

        RuleFor(x => x.LinkedInUrl)
            .MaximumLength(255).WithMessage("LinkedIn URL must not exceed 255 characters")
            .Must(CompanyFieldRules.IsValidWebsite).WithMessage("LinkedIn URL must be a valid http(s) URL")
            .When(x => x.LinkedInUrl != null);

        RuleFor(x => x.FacebookUrl)
            .MaximumLength(255).WithMessage("Facebook URL must not exceed 255 characters")
            .Must(CompanyFieldRules.IsValidWebsite).WithMessage("Facebook URL must be a valid http(s) URL")
            .When(x => x.FacebookUrl != null);

        RuleFor(x => x.Location)
            .MaximumLength(255).WithMessage("Location must not exceed 255 characters")
            .When(x => x.Location != null);

        RuleFor(x => x.CompanySize)
            .Must(CompanyFieldRules.IsAllowedSize)
            .WithMessage($"Company size must be one of: {string.Join(", ", CompanyFieldRules.AllowedSizes)}")
            .When(x => x.CompanySize != null);
    }
}
