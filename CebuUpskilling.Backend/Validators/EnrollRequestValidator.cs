using CebuUpskilling.Backend.Entities;
using FluentValidation;

namespace CebuUpskilling.Backend.Validators;

public class EnrollRequestValidator : AbstractValidator<LearnerStudyCourse>
{
    public EnrollRequestValidator()
    {
        RuleFor(x => x.CourseId)
            .GreaterThan(0).WithMessage("Course ID must be greater than 0");
    }
}
