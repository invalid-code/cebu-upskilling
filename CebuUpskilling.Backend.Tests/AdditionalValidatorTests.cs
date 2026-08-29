using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Validators;
using FluentValidation;

namespace CebuUpskilling.Backend.Tests;

public class EmailRequestValidatorTests
{
    private readonly EmailRequestValidator _sut = new();

    [Fact]
    public void Valid_Passes() => Assert.True(_sut.Validate(new EmailRequest("a@b.com")).IsValid);

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    public void Invalid_Fails(string email) =>
        Assert.False(_sut.Validate(new EmailRequest(email)).IsValid);

    [Fact]
    public void Over255_Fails() =>
        Assert.False(_sut.Validate(new EmailRequest(new string('a', 250) + "@b.com")).IsValid);
}

public class ConfirmEmailRequestValidatorTests
{
    private readonly ConfirmEmailRequestValidator _sut = new();

    [Fact]
    public void Valid_Passes() =>
        Assert.True(_sut.Validate(new ConfirmEmailRequest("a@b.com", "tok-123")).IsValid);

    [Fact]
    public void MissingEmail_Fails() =>
        Assert.False(_sut.Validate(new ConfirmEmailRequest("", "tok")).IsValid);

    [Fact]
    public void MissingToken_Fails() =>
        Assert.False(_sut.Validate(new ConfirmEmailRequest("a@b.com", "")).IsValid);

    [Fact]
    public void OversizedToken_Fails() =>
        Assert.False(_sut.Validate(new ConfirmEmailRequest("a@b.com", new string('a', 513))).IsValid);
}

public class ResetPasswordRequestValidatorTests
{
    private readonly ResetPasswordRequestValidator _sut = new();

    [Fact]
    public void Valid_Passes() =>
        Assert.True(_sut.Validate(new ResetPasswordRequest("a@b.com", "tok", "NewPass1")).IsValid);

    [Fact]
    public void ShortPassword_Fails() =>
        Assert.False(_sut.Validate(new ResetPasswordRequest("a@b.com", "tok", "abc")).IsValid);

    [Fact]
    public void LongPassword_Fails() =>
        Assert.False(_sut.Validate(new ResetPasswordRequest("a@b.com", "tok", new string('a', 101))).IsValid);

    [Fact]
    public void InvalidEmail_Fails() =>
        Assert.False(_sut.Validate(new ResetPasswordRequest("bad", "tok", "NewPass1")).IsValid);

    [Fact]
    public void MissingToken_Fails() =>
        Assert.False(_sut.Validate(new ResetPasswordRequest("a@b.com", "", "NewPass1")).IsValid);
}

public class PostRequestValidatorTests
{
    private readonly PostRequestValidator _sut = new();

    private static PostRequest Valid() => new(
        Title: "Senior .NET Developer",
        Description: "Build great things",
        TargetRole: "Backend Developer",
        Location: "Cebu City",
        SalaryRange: "₱60,000 - ₱90,000",
        JobType: "Full-time",
        ExperienceLevel: "Senior",
        Requirements: "5+ years",
        Benefits: "HMO",
        IsRemote: false,
        ExpiresAt: DateTime.UtcNow.AddDays(30),
        IsActive: true,
        CompanyLogoUrl: "https://acme.com/logo.png",
        Schedule: "Full-time",
        RequiredSkills: new List<RequiredSkillInput> { new(1, 3) }
    );

    [Fact]
    public void Valid_Passes() => Assert.True(_sut.Validate(Valid()).IsValid);

    [Fact]
    public void EmptyTitle_Fails()
    {
        Assert.False(_sut.Validate(Valid() with { Title = "" }).IsValid);
    }

    [Fact]
    public void OverlongTitle_Fails()
    {
        Assert.False(_sut.Validate(Valid() with { Title = new string('a', 256) }).IsValid);
    }

    [Fact]
    public void OverlongDescription_Fails()
    {
        Assert.False(_sut.Validate(Valid() with { Description = new string('a', 10001) }).IsValid);
    }

    [Theory]
    [InlineData("HackerTime")]
    [InlineData("")]
    public void DisallowedJobType_Fails(string jobType)
    {
        Assert.False(_sut.Validate(Valid() with { JobType = jobType }).IsValid);
    }

    [Fact]
    public void ExpiredAtInPast_Fails()
    {
        Assert.False(_sut.Validate(Valid() with { ExpiresAt = DateTime.UtcNow.AddDays(-1) }).IsValid);
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("not-a-url")]
    [InlineData("ftp://example.com/x")]
    public void InvalidLogoUrl_Fails(string url)
    {
        Assert.False(_sut.Validate(Valid() with { CompanyLogoUrl = url }).IsValid);
    }

    [Fact]
    public void TooManyRequiredSkills_Fails()
    {
        var many = Enumerable.Range(1, 51).Select(i => new RequiredSkillInput(i, 1)).ToList();
        Assert.False(_sut.Validate(Valid() with { RequiredSkills = many }).IsValid);
    }

    [Fact]
    public void InvalidRequiredLevel_Fails()
    {
        Assert.False(_sut.Validate(Valid() with
        {
            RequiredSkills = new List<RequiredSkillInput> { new(1, 10) }
        }).IsValid);
    }
}

public class PostQueryParamsValidatorTests
{
    private readonly PostQueryParamsValidator _sut = new();

    [Fact]
    public void Defaults_Pass() =>
        Assert.True(_sut.Validate(new PostQueryParams()).IsValid);

    [Fact]
    public void PageZero_Fails() =>
        Assert.False(_sut.Validate(new PostQueryParams(Page: 0)).IsValid);

    [Fact]
    public void PageSizeTooBig_Fails() =>
        Assert.False(_sut.Validate(new PostQueryParams(PageSize: 1000)).IsValid);

    [Theory]
    [InlineData("relevance")]
    [InlineData("NEWEST")]
    [InlineData("oldest")]
    public void AllowedSortBy_Passes(string sortBy) =>
        Assert.True(_sut.Validate(new PostQueryParams(SortBy: sortBy)).IsValid);

    [Fact]
    public void DisallowedSortBy_Fails() =>
        Assert.False(_sut.Validate(new PostQueryParams(SortBy: "DROP TABLE")).IsValid);
}

public class SaveCourseRequestValidatorTests
{
    private readonly SaveCourseRequestValidator _sut = new();

    private static SaveCourseRequest Valid() => new()
    {
        Name = "Intro to C#",
        Description = "Learn C#",
        TechnicalLevel = 2,
        Mode = "Online",
        Price = 0,
        Modules = new List<SaveModuleRequest>
        {
            new()
            {
                Name = "Module 1",
                Description = "Basics",
                Order = 0,
                Lessons = new List<SaveLessonRequest>
                {
                    new() { Name = "Lesson 1", Order = 0 }
                }
            }
        }
    };

    [Fact]
    public void Valid_Passes() => Assert.True(_sut.Validate(Valid()).IsValid);

    [Fact]
    public void EmptyCourseName_Fails()
    {
        var r = Valid();
        r.Name = "";
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void OutOfRangeTechnicalLevel_Fails(int level)
    {
        var r = Valid();
        r.TechnicalLevel = level;
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void NegativePrice_Fails()
    {
        var r = Valid();
        r.Price = -1;
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void EmptyModuleName_Fails()
    {
        var r = Valid();
        r.Modules[0].Name = "";
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void EmptyLessonName_Fails()
    {
        var r = Valid();
        r.Modules[0].Lessons[0].Name = "";
        Assert.False(_sut.Validate(r).IsValid);
    }
}

public class ParseSkillsRequestValidatorTests
{
    private readonly ParseSkillsRequestValidator _sut = new();

    [Fact]
    public void Valid_Passes() =>
        Assert.True(_sut.Validate(new ParseSkillsRequest("Experienced developer with C# and .NET")).IsValid);

    [Fact]
    public void Empty_Fails() =>
        Assert.False(_sut.Validate(new ParseSkillsRequest("")).IsValid);

    [Fact]
    public void Whitespace_Fails() =>
        Assert.False(_sut.Validate(new ParseSkillsRequest("   ")).IsValid);

    [Fact]
    public void Over50000_Fails() =>
        Assert.False(_sut.Validate(new ParseSkillsRequest(new string('a', 50001))).IsValid);

    [Fact]
    public void Null_Fails() =>
        Assert.False(_sut.Validate(new ParseSkillsRequest(null!)).IsValid);
}

public class LogIntegrityEventRequestValidatorTests
{
    private readonly LogIntegrityEventRequestValidator _sut = new();

    [Theory]
    [InlineData("TabLeft")]
    [InlineData("TabReturned")]
    [InlineData("WindowBlur")]
    [InlineData("FullscreenExited")]
    public void Allowed_Passes(string type) =>
        Assert.True(_sut.Validate(new LogIntegrityEventRequest(type, "detail")).IsValid);

    [Theory]
    [InlineData("evil")]
    [InlineData("")]
    public void Disallowed_Fails(string type) =>
        Assert.False(_sut.Validate(new LogIntegrityEventRequest(type, null)).IsValid);

    [Fact]
    public void OverlongDetail_Fails() =>
        Assert.False(_sut.Validate(new LogIntegrityEventRequest("TabLeft", new string('a', 501))).IsValid);
}

public class EmployerUpdateApplicationStatusRequestValidatorTests
{
    private readonly EmployerUpdateApplicationStatusRequestValidator _sut = new();

    [Theory]
    [InlineData("applied")]
    [InlineData("reviewing")]
    [InlineData("interview")]
    [InlineData("rejected")]
    [InlineData("hired")]
    [InlineData("HIRED")]
    public void Allowed_Passes(string s) =>
        Assert.True(_sut.Validate(new EmployerUpdateApplicationStatusRequest(s)).IsValid);

    [Theory]
    [InlineData("")]
    [InlineData("banana")]
    [InlineData("' OR 1=1; --")]
    public void Disallowed_Fails(string s) =>
        Assert.False(_sut.Validate(new EmployerUpdateApplicationStatusRequest(s)).IsValid);
}

public class CreateCompanyDtoValidatorTests
{
    private readonly CreateCompanyDtoValidator _sut = new();

    [Fact]
    public void Valid_Passes() => Assert.True(_sut.Validate(new CreateCompanyDto("Acme Corp")).IsValid);

    [Theory]
    [InlineData("")]
    [InlineData("A")]
    [InlineData(null)]
    public void Invalid_Fails(string? name) =>
        Assert.False(_sut.Validate(new CreateCompanyDto(name!)).IsValid);

    [Fact]
    public void OverlongName_Fails() =>
        Assert.False(_sut.Validate(new CreateCompanyDto(new string('a', 256))).IsValid);
}
