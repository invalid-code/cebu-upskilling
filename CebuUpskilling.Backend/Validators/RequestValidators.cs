using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using FluentValidation;

namespace CebuUpskilling.Backend.Validators;

public class ApplyRequestValidator : AbstractValidator<ApplyRequest>
{
    public ApplyRequestValidator()
    {
        RuleFor(x => x.PostId)
            .GreaterThan(0).WithMessage("Post ID must be greater than 0");
    }
}

public class UpdateApplicationStatusRequestValidator : AbstractValidator<UpdateApplicationStatusRequest>
{
    private static readonly string[] AllowedStatuses = { "applied", "saved", "withdrawn" };

    public UpdateApplicationStatusRequestValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty().WithMessage("Status is required")
            .MaximumLength(50).WithMessage("Status must not exceed 50 characters")
            .Must(s => AllowedStatuses.Contains(s, StringComparer.OrdinalIgnoreCase))
            .WithMessage($"Status must be one of: {string.Join(", ", AllowedStatuses)}");
    }
}

public class UpdateLessonProgressRequestValidator : AbstractValidator<UpdateLessonProgressRequest>
{
    public UpdateLessonProgressRequestValidator()
    {
        RuleFor(x => x.LessonId)
            .GreaterThan(0).WithMessage("Lesson ID must be greater than 0");

        RuleFor(x => x.ProgressPercent)
            .InclusiveBetween(0, 100).WithMessage("Progress percent must be between 0 and 100");
    }
}

public class CourseRecommendationRequestValidator : AbstractValidator<CourseRecommendationRequest>
{
    public CourseRecommendationRequestValidator()
    {
        RuleFor(x => x.Category)
            .MaximumLength(100).WithMessage("Category must not exceed 100 characters")
            .When(x => !string.IsNullOrWhiteSpace(x.Category));
    }
}

public class SubmitAssessmentRequestValidator : AbstractValidator<SubmitAssessmentRequest>
{
    public SubmitAssessmentRequestValidator()
    {
        RuleFor(x => x.Answers)
            .NotNull().WithMessage("Answers are required")
            .NotEmpty().WithMessage("At least one answer is required");

        RuleForEach(x => x.Answers)
            .SetValidator(new SubmitAnswerRequestValidator());
    }
}

public class SubmitAnswerRequestValidator : AbstractValidator<SubmitAnswerRequest>
{
    public SubmitAnswerRequestValidator()
    {
        RuleFor(x => x.QuestionId)
            .GreaterThan(0).WithMessage("Question ID must be greater than 0");

        RuleFor(x => x.SelectedOption)
            .GreaterThanOrEqualTo(0).WithMessage("Selected option must be a valid option index")
            .LessThan(4).WithMessage("Selected option must be a valid option index");
    }
}

public class StartAssessmentRequestValidator : AbstractValidator<StartAssessmentRequest>
{
    public StartAssessmentRequestValidator()
    {
        RuleFor(x => x.SkillId)
            .GreaterThan(0).WithMessage("Skill ID must be greater than 0");
    }
}

public class CreateCompanyQuestionRequestValidator : AbstractValidator<CreateCompanyQuestionRequest>
{
    public CreateCompanyQuestionRequestValidator()
    {
        RuleFor(x => x.SkillId)
            .GreaterThan(0).WithMessage("Skill ID must be greater than 0");

        RuleFor(x => x.Text)
            .NotEmpty().WithMessage("Question text is required")
            .MaximumLength(1000).WithMessage("Question text must not exceed 1000 characters");

        RuleFor(x => x.OptionA)
            .NotEmpty().WithMessage("Option A is required")
            .MaximumLength(500).WithMessage("Option A must not exceed 500 characters");

        RuleFor(x => x.OptionB)
            .NotEmpty().WithMessage("Option B is required")
            .MaximumLength(500).WithMessage("Option B must not exceed 500 characters");

        RuleFor(x => x.OptionC)
            .NotEmpty().WithMessage("Option C is required")
            .MaximumLength(500).WithMessage("Option C must not exceed 500 characters");

        RuleFor(x => x.OptionD)
            .NotEmpty().WithMessage("Option D is required")
            .MaximumLength(500).WithMessage("Option D must not exceed 500 characters");

        RuleFor(x => x.CorrectOption)
            .InclusiveBetween(0, 3).WithMessage("Correct option must be between 0 and 3");
    }
}

public class UpsertNoteRequestValidator : AbstractValidator<UpsertNoteRequest>
{
    public UpsertNoteRequestValidator()
    {
        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Note content is required")
            .MaximumLength(20000).WithMessage("Note content must not exceed 20000 characters");
    }
}

public class CreateDiscussionPostRequestValidator : AbstractValidator<CreateDiscussionPostRequest>
{
    public CreateDiscussionPostRequestValidator()
    {
        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Post content is required")
            .MaximumLength(4000).WithMessage("Post content must not exceed 4000 characters");
    }
}