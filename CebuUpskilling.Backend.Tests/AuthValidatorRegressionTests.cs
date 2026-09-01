using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Validators;
using FluentValidation;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Regression coverage for validators that previously had 0% line-rate (see coverage.cobertura.xml).
/// These exercise every rule branch including past-date birthday validation.
/// </summary>
public class RegisterRequestValidatorRegressionTests
{
    private readonly RegisterRequestValidator _sut = new();

    private static RegisterRequest Valid() => new(
        FirstName: "Jose",
        LastName: "Rizal",
        MiddleName: null,
        Birthday: "1990-01-01",
        EmailAddress: "jose@example.com",
        Password: "P@ssw0rd!",
        Role: "Learner",
        TargetRole: null,
        Address: null
    );

    [Fact]
    public void Valid_Passes() => Assert.True(_sut.Validate(Valid()).IsValid);

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void FirstName_Empty_Fails(string? name)
    {
        var r = Valid() with { FirstName = name! };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void FirstName_Over255_Fails()
    {
        var r = Valid() with { FirstName = new string('a', 256) };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void LastName_Empty_Fails()
    {
        var r = Valid() with { LastName = "" };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void Email_Invalid_Fails()
    {
        var r = Valid() with { EmailAddress = "not-an-email" };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void Password_TooShort_Fails()
    {
        var r = Valid() with { Password = "123" };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void Password_TooLong_Fails()
    {
        var r = Valid() with { Password = new string('a', 101) };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("")]
    [InlineData("learner")]
    public void Role_Invalid_Fails(string role)
    {
        var r = Valid() with { Role = role };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Theory]
    [InlineData("Learner")]
    [InlineData("Recruiter")]
    [InlineData("CourseProvider")]
    public void Role_Valid_Passes(string role)
    {
        var r = Valid() with { Role = role };
        Assert.True(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void TargetRole_Over100_Fails()
    {
        var r = Valid() with { TargetRole = new string('a', 101) };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void Birthday_Future_Fails()
    {
        var future = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd");
        var r = Valid() with { Birthday = future };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void Birthday_InvalidFormat_Fails()
    {
        var r = Valid() with { Birthday = "not-a-date" };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void Birthday_Null_Passes()
    {
        var r = Valid() with { Birthday = null };
        Assert.True(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void MiddleName_Over255_Fails()
    {
        var r = Valid() with { MiddleName = new string('a', 256) };
        Assert.False(_sut.Validate(r).IsValid);
    }
}

public class CompanyRegisterRequestValidatorRegressionTests
{
    private readonly CompanyRegisterRequestValidator _sut = new();

    private static CompanyRegisterRequest Valid() => new(
        CompanyName: "Acme Corp",
        FirstName: "Maria",
        LastName: "Santos",
        MiddleName: null,
        Birthday: "1990-01-01",
        EmailAddress: "maria@acme.com",
        Password: "P@ssw0rd!",
        Address: null
    );

    [Fact]
    public void Valid_Passes() => Assert.True(_sut.Validate(Valid()).IsValid);

    [Fact]
    public void CompanyName_TooShort_Fails()
    {
        var r = Valid() with { CompanyName = "A" };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void CompanyName_Empty_Fails()
    {
        var r = Valid() with { CompanyName = "" };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void Email_Invalid_Fails()
    {
        var r = Valid() with { EmailAddress = "bad" };
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void Birthday_Future_Fails()
    {
        var r = Valid() with { Birthday = DateTime.UtcNow.AddDays(5).ToString("yyyy-MM-dd") };
        Assert.False(_sut.Validate(r).IsValid);
    }
}

public class LoginRequestValidatorRegressionTests
{
    private readonly LoginRequestValidator _sut = new();

    [Fact]
    public void Valid_Passes() => Assert.True(_sut.Validate(new LoginRequest("a@b.com", "secret")).IsValid);

    [Fact]
    public void Email_Empty_Fails() => Assert.False(_sut.Validate(new LoginRequest("", "secret")).IsValid);

    [Fact]
    public void Email_Invalid_Fails() => Assert.False(_sut.Validate(new LoginRequest("not-email", "secret")).IsValid);

    [Fact]
    public void Password_Empty_Fails() => Assert.False(_sut.Validate(new LoginRequest("a@b.com", "")).IsValid);
}

public class UpdateProfileRequestValidatorRegressionTests
{
    private readonly UpdateProfileRequestValidator _sut = new();

    [Fact]
    public void Valid_Null_Passes() => Assert.True(_sut.Validate(new UpdateProfileRequest(null, null)).IsValid);

    [Fact]
    public void TargetRole_Over100_Fails()
    {
        var r = new UpdateProfileRequest(new string('a', 101), null);
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void Address_Over255_Fails()
    {
        var r = new UpdateProfileRequest(null, new string('a', 256));
        Assert.False(_sut.Validate(r).IsValid);
    }

    [Fact]
    public void Both_Valid_Passes()
    {
        var r = new UpdateProfileRequest("Backend Developer", "123 Main St");
        Assert.True(_sut.Validate(r).IsValid);
    }
}

public class UpsertNoteRequestValidatorRegressionTests
{
    private readonly UpsertNoteRequestValidator _sut = new();

    [Fact]
    public void Valid_Passes() => Assert.True(_sut.Validate(new CebuUpskilling.Backend.DTOs.UpsertNoteRequest("hello world")).IsValid);

    [Fact]
    public void Empty_Fails() => Assert.False(_sut.Validate(new CebuUpskilling.Backend.DTOs.UpsertNoteRequest("")).IsValid);

    [Fact]
    public void Whitespace_Fails() => Assert.False(_sut.Validate(new CebuUpskilling.Backend.DTOs.UpsertNoteRequest("   ")).IsValid);

    [Fact]
    public void Over20000_Fails() => Assert.False(_sut.Validate(new CebuUpskilling.Backend.DTOs.UpsertNoteRequest(new string('a', 20001))).IsValid);

    [Fact]
    public void Exactly20000_Passes() => Assert.True(_sut.Validate(new CebuUpskilling.Backend.DTOs.UpsertNoteRequest(new string('a', 20000))).IsValid);
}
