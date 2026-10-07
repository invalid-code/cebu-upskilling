using CebuUpskilling.Backend.Entities;
using FluentValidation;

namespace CebuUpskilling.Backend.Validators;

public class EnrollRequestValidator : AbstractValidator<LearnerStudyCourse>
{
    public EnrollRequestValidator()
    {
        RuleFor(x => x.CourseId)
            .NotEmpty().WithMessage("Course ID must not be empty");
    }
}
