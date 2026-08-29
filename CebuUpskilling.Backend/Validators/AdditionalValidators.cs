using CebuUpskilling.Backend.DTOs;
using FluentValidation;

namespace CebuUpskilling.Backend.Validators;

public class EmailRequestValidator : AbstractValidator<EmailRequest>
{
    public EmailRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("A valid email address is required")
            .MaximumLength(255).WithMessage("Email must not exceed 255 characters");
    }
}

public class ConfirmEmailRequestValidator : AbstractValidator<ConfirmEmailRequest>
{
    public ConfirmEmailRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("A valid email address is required")
            .MaximumLength(255).WithMessage("Email must not exceed 255 characters");

        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Token is required")
            .MaximumLength(512).WithMessage("Token must not exceed 512 characters");
    }
}

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("A valid email address is required")
            .MaximumLength(255).WithMessage("Email must not exceed 255 characters");

        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Token is required")
            .MaximumLength(512).WithMessage("Token must not exceed 512 characters");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("New password is required")
            .MinimumLength(6).WithMessage("Password must be at least 6 characters")
            .MaximumLength(100).WithMessage("Password must not exceed 100 characters");
    }
}

public class PostRequestValidator : AbstractValidator<PostRequest>
{
    private static readonly string[] AllowedJobTypes =
        { "Full-time", "Part-time", "Contract", "Side-hustle" };
    private static readonly string[] AllowedExperienceLevels =
        { "", "Entry", "Junior", "Mid", "Senior", "Lead" };
    private static readonly string[] AllowedSchedules =
        { "Full-time", "Part-time", "Contract", "Side-hustle", "Internship" };

    public PostRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .MaximumLength(255).WithMessage("Title must not exceed 255 characters");

        RuleFor(x => x.Description)
            .MaximumLength(10_000).WithMessage("Description must not exceed 10000 characters")
            .When(x => x.Description != null);

        RuleFor(x => x.TargetRole)
            .MaximumLength(100).WithMessage("Target role must not exceed 100 characters")
            .When(x => x.TargetRole != null);

        RuleFor(x => x.Location)
            .MaximumLength(255).WithMessage("Location must not exceed 255 characters")
            .When(x => x.Location != null);

        RuleFor(x => x.SalaryRange)
            .MaximumLength(100).WithMessage("Salary range must not exceed 100 characters")
            .When(x => x.SalaryRange != null);

        RuleFor(x => x.JobType)
            .Must(t => AllowedJobTypes.Contains(t ?? "", StringComparer.OrdinalIgnoreCase))
            .WithMessage($"Job type must be one of: {string.Join(", ", AllowedJobTypes)}")
            .When(x => x.JobType != null);

        RuleFor(x => x.ExperienceLevel)
            .Must(l => AllowedExperienceLevels.Contains(l ?? "", StringComparer.OrdinalIgnoreCase))
            .WithMessage("Experience level is not allowed")
            .When(x => x.ExperienceLevel != null);

        RuleFor(x => x.Requirements)
            .MaximumLength(5000).WithMessage("Requirements must not exceed 5000 characters")
            .When(x => x.Requirements != null);

        RuleFor(x => x.Benefits)
            .MaximumLength(5000).WithMessage("Benefits must not exceed 5000 characters")
            .When(x => x.Benefits != null);

        RuleFor(x => x.ExpiresAt)
            .Must(d => d == null || d.Value > DateTime.UtcNow)
            .WithMessage("Expiration date must be in the future")
            .When(x => x.ExpiresAt.HasValue);

        RuleFor(x => x.CompanyLogoUrl)
            .MaximumLength(2048).WithMessage("Company logo URL must not exceed 2048 characters")
            .Must(BeAValidHttpUrl).WithMessage("Company logo URL must be a valid http(s) URL")
            .When(x => !string.IsNullOrWhiteSpace(x.CompanyLogoUrl));

        RuleFor(x => x.Schedule)
            .Must(s => AllowedSchedules.Contains(s ?? "Full-time", StringComparer.OrdinalIgnoreCase))
            .WithMessage($"Schedule must be one of: {string.Join(", ", AllowedSchedules)}")
            .When(x => x.Schedule != null);

        RuleFor(x => x.RequiredSkills)
            .Must(skills => skills == null || skills.Count <= 50)
            .WithMessage("A post may not list more than 50 required skills")
            .When(x => x.RequiredSkills != null);

        RuleForEach(x => x.RequiredSkills)
            .SetValidator(new RequiredSkillInputValidator())
            .When(x => x.RequiredSkills != null);
    }

    private static bool BeAValidHttpUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        return Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}

public class RequiredSkillInputValidator : AbstractValidator<RequiredSkillInput>
{
    public RequiredSkillInputValidator()
    {
        RuleFor(x => x.SkillId)
            .GreaterThan(0).WithMessage("Skill ID must be greater than 0");

        RuleFor(x => x.RequiredLevel)
            .InclusiveBetween(1, 5).WithMessage("Required level must be between 1 and 5");
    }
}

public class PostQueryParamsValidator : AbstractValidator<PostQueryParams>
{
    private static readonly string[] AllowedSortBy = { "newest", "oldest", "relevance" };

    public PostQueryParamsValidator()
    {
        RuleFor(x => x.Search)
            .MaximumLength(255).WithMessage("Search must not exceed 255 characters")
            .When(x => x.Search != null);

        RuleFor(x => x.TargetRole)
            .MaximumLength(100).WithMessage("Target role must not exceed 100 characters")
            .When(x => x.TargetRole != null);

        RuleFor(x => x.JobType)
            .MaximumLength(50).WithMessage("Job type must not exceed 50 characters")
            .When(x => x.JobType != null);

        RuleFor(x => x.Location)
            .MaximumLength(255).WithMessage("Location must not exceed 255 characters")
            .When(x => x.Location != null);

        RuleFor(x => x.SortBy)
            .Must(s => AllowedSortBy.Contains(s ?? "newest", StringComparer.OrdinalIgnoreCase))
            .WithMessage($"Sort by must be one of: {string.Join(", ", AllowedSortBy)}")
            .When(x => x.SortBy != null);

        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(1).WithMessage("Page must be 1 or greater");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100).WithMessage("Page size must be between 1 and 100");
    }
}

public class SaveCourseRequestValidator : AbstractValidator<SaveCourseRequest>
{
    public SaveCourseRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Course name is required")
            .MaximumLength(255).WithMessage("Course name must not exceed 255 characters");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters")
            .When(x => x.Description != null);

        RuleFor(x => x.TechnicalLevel)
            .InclusiveBetween(1, 5).WithMessage("Technical level must be between 1 and 5");

        RuleFor(x => x.Mode)
            .NotEmpty().WithMessage("Mode is required")
            .MaximumLength(50).WithMessage("Mode must not exceed 50 characters");

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("Price must not be negative")
            .LessThanOrEqualTo(1_000_000).WithMessage("Price must not exceed 1000000")
            .When(x => x.Price.HasValue);

        RuleFor(x => x.GenreId)
            .GreaterThan(0).WithMessage("Genre ID must be greater than 0")
            .When(x => x.GenreId.HasValue);

        RuleFor(x => x.Modules)
            .NotNull().WithMessage("Modules are required");

        RuleForEach(x => x.Modules)
            .SetValidator(new SaveModuleRequestValidator());
    }
}

public class SaveModuleRequestValidator : AbstractValidator<SaveModuleRequest>
{
    public SaveModuleRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Module name is required")
            .MaximumLength(255).WithMessage("Module name must not exceed 255 characters");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Module description must not exceed 2000 characters")
            .When(x => x.Description != null);

        RuleFor(x => x.Order)
            .GreaterThanOrEqualTo(0).WithMessage("Order must be 0 or greater");

        RuleForEach(x => x.Lessons)
            .SetValidator(new SaveLessonRequestValidator());
    }
}

public class SaveLessonRequestValidator : AbstractValidator<SaveLessonRequest>
{
    public SaveLessonRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Lesson name is required")
            .MaximumLength(255).WithMessage("Lesson name must not exceed 255 characters");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Lesson description must not exceed 2000 characters")
            .When(x => x.Description != null);

        RuleFor(x => x.Order)
            .GreaterThanOrEqualTo(0).WithMessage("Order must be 0 or greater");
    }
}

public class ParseSkillsRequestValidator : AbstractValidator<ParseSkillsRequest>
{
    public ParseSkillsRequestValidator()
    {
        RuleFor(x => x.ResumeText)
            .NotEmpty().WithMessage("ResumeText is required")
            .MaximumLength(50_000).WithMessage("ResumeText must not exceed 50000 characters");
    }
}

public class LogIntegrityEventRequestValidator : AbstractValidator<LogIntegrityEventRequest>
{
    private static readonly string[] AllowedEventTypes =
        { "TabLeft", "TabReturned", "WindowBlur", "WindowFocus", "FullscreenExited" };

    public LogIntegrityEventRequestValidator()
    {
        RuleFor(x => x.EventType)
            .NotEmpty().WithMessage("Event type is required")
            .Must(t => AllowedEventTypes.Contains(t, StringComparer.Ordinal))
            .WithMessage($"Event type must be one of: {string.Join(", ", AllowedEventTypes)}");

        RuleFor(x => x.Detail)
            .MaximumLength(500).WithMessage("Detail must not exceed 500 characters")
            .When(x => x.Detail != null);
    }
}

public class EmployerUpdateApplicationStatusRequestValidator : AbstractValidator<EmployerUpdateApplicationStatusRequest>
{
    private static readonly string[] AllowedStatuses =
        { "applied", "saved", "withdrawn", "reviewing", "interview", "rejected", "hired" };

    public EmployerUpdateApplicationStatusRequestValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty().WithMessage("Status is required")
            .MaximumLength(50).WithMessage("Status must not exceed 50 characters")
            .Must(s => AllowedStatuses.Contains(s, StringComparer.OrdinalIgnoreCase))
            .WithMessage($"Status must be one of: {string.Join(", ", AllowedStatuses)}");
    }
}

public class CreateCompanyDtoValidator : AbstractValidator<CreateCompanyDto>
{
    public CreateCompanyDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Company name is required")
            .MinimumLength(2).WithMessage("Company name must be at least 2 characters")
            .MaximumLength(255).WithMessage("Company name must not exceed 255 characters");
    }
}
