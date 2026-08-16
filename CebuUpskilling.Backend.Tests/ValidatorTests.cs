using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Validators;

namespace CebuUpskilling.Backend.Tests;

public class ApplyRequestValidatorTests
{
    private readonly ApplyRequestValidator _validator = new();

    [Fact]
    public void Valid_ApplyRequest_Passes()
    {
        var result = _validator.Validate(new ApplyRequest(PostId: 1));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ZeroPostId_Fails()
    {
        var result = _validator.Validate(new ApplyRequest(PostId: 0));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void NegativePostId_Fails()
    {
        var result = _validator.Validate(new ApplyRequest(PostId: -5));
        Assert.False(result.IsValid);
    }
}

public class UpdateApplicationStatusRequestValidatorTests
{
    private readonly UpdateApplicationStatusRequestValidator _validator = new();

    [Theory]
    [InlineData("applied")]
    [InlineData("saved")]
    [InlineData("withdrawn")]
    [InlineData("APPLIED")]
    public void AllowedStatus_Passes(string status)
    {
        var result = _validator.Validate(new UpdateApplicationStatusRequest(status));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void EmptyStatus_Fails()
    {
        var result = _validator.Validate(new UpdateApplicationStatusRequest(""));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void NullStatus_Fails()
    {
        var result = _validator.Validate(new UpdateApplicationStatusRequest(null!));
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("rejected")]
    [InlineData("interviewing")]
    [InlineData("hired")]
    public void DisallowedStatus_Fails(string status)
    {
        var result = _validator.Validate(new UpdateApplicationStatusRequest(status));
        Assert.False(result.IsValid);
    }
}

public class UpdateLessonProgressRequestValidatorTests
{
    private readonly UpdateLessonProgressRequestValidator _validator = new();

    [Theory]
    [InlineData(0)]
    [InlineData(50)]
    [InlineData(100)]
    public void ValidProgress_Passes(int progress)
    {
        var result = _validator.Validate(new UpdateLessonProgressRequest(LessonId: 1, progress));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void NegativeProgress_Fails()
    {
        var result = _validator.Validate(new UpdateLessonProgressRequest(LessonId: 1, -1));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void OverHundredProgress_Fails()
    {
        var result = _validator.Validate(new UpdateLessonProgressRequest(LessonId: 1, 101));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void ZeroLessonId_Fails()
    {
        var result = _validator.Validate(new UpdateLessonProgressRequest(LessonId: 0, 50));
        Assert.False(result.IsValid);
    }
}

public class CourseRecommendationRequestValidatorTests
{
    private readonly CourseRecommendationRequestValidator _validator = new();

    [Fact]
    public void NullCategory_Passes()
    {
        var result = _validator.Validate(new CourseRecommendationRequest(null));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidCategory_Passes()
    {
        var result = _validator.Validate(new CourseRecommendationRequest("Programming"));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void OverlongCategory_Fails()
    {
        var result = _validator.Validate(new CourseRecommendationRequest(new string('a', 101)));
        Assert.False(result.IsValid);
    }
}

public class SubmitAssessmentRequestValidatorTests
{
    private readonly SubmitAssessmentRequestValidator _validator = new();

    [Fact]
    public void ValidAnswers_Passes()
    {
        var request = new SubmitAssessmentRequest(
            new List<SubmitAnswerRequest>
            {
                new(QuestionId: 1, SelectedOption: 0),
                new(QuestionId: 2, SelectedOption: 3)
            });
        var result = _validator.Validate(request);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void EmptyAnswers_Fails()
    {
        var request = new SubmitAssessmentRequest(new List<SubmitAnswerRequest>());
        var result = _validator.Validate(request);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void NullAnswers_Fails()
    {
        var request = new SubmitAssessmentRequest(null!);
        var result = _validator.Validate(request);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void InvalidChildAnswer_Fails()
    {
        var request = new SubmitAssessmentRequest(
            new List<SubmitAnswerRequest>
            {
                new(QuestionId: 1, SelectedOption: 10)
            });
        var result = _validator.Validate(request);
        Assert.False(result.IsValid);
    }
}

public class StartAssessmentRequestValidatorTests
{
    private readonly StartAssessmentRequestValidator _validator = new();

    [Fact]
    public void ValidSkillId_Passes()
    {
        var result = _validator.Validate(new StartAssessmentRequest(SkillId: 5));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ZeroSkillId_Fails()
    {
        var result = _validator.Validate(new StartAssessmentRequest(SkillId: 0));
        Assert.False(result.IsValid);
    }
}

public class CreateCompanyQuestionRequestValidatorTests
{
    private readonly CreateCompanyQuestionRequestValidator _validator = new();

    [Fact]
    public void ValidQuestion_Passes()
    {
        var request = new CreateCompanyQuestionRequest(
            SkillId: 1,
            Text: "What is C#?",
            OptionA: "Language",
            OptionB: "Framework",
            OptionC: "Database",
            OptionD: "OS",
            CorrectOption: 0);
        var result = _validator.Validate(request);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void EmptyText_Fails()
    {
        var request = new CreateCompanyQuestionRequest(
            SkillId: 1,
            Text: "",
            OptionA: "A",
            OptionB: "B",
            OptionC: "C",
            OptionD: "D",
            CorrectOption: 0);
        var result = _validator.Validate(request);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void InvalidCorrectOption_Fails()
    {
        var request = new CreateCompanyQuestionRequest(
            SkillId: 1,
            Text: "Question",
            OptionA: "A",
            OptionB: "B",
            OptionC: "C",
            OptionD: "D",
            CorrectOption: 4);
        var result = _validator.Validate(request);
        Assert.False(result.IsValid);
    }
}

public class EnrollRequestValidatorTests
{
    private readonly EnrollRequestValidator _validator = new();

    [Fact]
    public void ValidCourseId_Passes()
    {
        var result = _validator.Validate(new LearnerStudyCourse { CourseId = 1 });
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ZeroCourseId_Fails()
    {
        var result = _validator.Validate(new LearnerStudyCourse { CourseId = 0 });
        Assert.False(result.IsValid);
    }
}