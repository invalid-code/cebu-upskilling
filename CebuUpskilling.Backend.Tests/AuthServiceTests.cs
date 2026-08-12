using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class AuthServiceTests
{
    private static IConfiguration CreateConfig() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-secret-key-that-is-at-least-32-characters-long",
            ["Jwt:Issuer"] = "CebuUpskilling",
            ["Jwt:Audience"] = "CebuUpskilling.Web"
        })
        .Build();

    private static AuthService CreateService(Data.ApplicationDbContext context) => new(
        context,
        new JwtTokenService(CreateConfig(), NullLogger<JwtTokenService>.Instance),
        NullLogger<AuthService>.Instance
    );

    private static RegisterRequest NewRegisterRequest() => new(
        FirstName: "Jose",
        LastName: "Rizal",
        MiddleName: null,
        Birthday: null,
        EmailAddress: "jose@example.com",
        Password: "P@ssw0rd!",
        Role: "Learner"
    );

    private static CompanyRegisterRequest NewCompanyRegisterRequest() => new(
        CompanyName: "Tech Solutions Inc",
        FirstName: "Maria",
        LastName: "Santos",
        MiddleName: null,
        Birthday: null,
        EmailAddress: "maria@tech.com",
        Password: "P@ssw0rd!",
        Address: null
    );

    [Fact]
    public async Task RegisterAsync_CreatesUser_ReturnsTokenAndProfile()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.RegisterAsync(NewRegisterRequest());

        Assert.True(result.UserId > 0);
        Assert.Equal("Jose", result.FirstName);
        Assert.Equal("jose@example.com", result.EmailAddress);
        Assert.Equal("Learner", result.Role);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));

        var saved = await context.Users.SingleAsync(u => u.EmailAddress == "jose@example.com");
        Assert.NotEqual("P@ssw0rd!", saved.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("P@ssw0rd!", saved.PasswordHash));
    }

    [Fact]
    public async Task RegisterAsync_LearnerRole_CreatesLearnerProfile()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.RegisterAsync(NewRegisterRequest());

        var learner = await context.Learners.SingleOrDefaultAsync(l => l.UserId == result.UserId);
        Assert.NotNull(learner);
        Assert.False(learner.IsPremium);
    }

    [Fact]
    public async Task RegisterAsync_WithTargetRole_CreatesLearnerSkills()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var request = NewRegisterRequest() with { TargetRole = "Frontend Developer" };
        var result = await service.RegisterAsync(request);

        var learner = await context.Learners.SingleAsync(l => l.UserId == result.UserId);
        var learnerSkills = await context.LearnerSkills.Where(ls => ls.LearnerId == learner.LearnerId).ToListAsync();
        Assert.NotEmpty(learnerSkills);
        Assert.All(learnerSkills, ls =>
        {
            Assert.Equal(0, ls.CurrentLevel);
            Assert.False(ls.Verified);
        });
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_Throws()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        await service.RegisterAsync(NewRegisterRequest());

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RegisterAsync(NewRegisterRequest()));
    }

    [Fact]
    public async Task CompanyRegisterAsync_CreatesCompanyAndRecruiter_ReturnsTokenAndCompanyInfo()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.CompanyRegisterAsync(NewCompanyRegisterRequest());

        Assert.True(result.UserId > 0);
        Assert.True(result.CompanyId > 0);
        Assert.Equal("Tech Solutions Inc", result.CompanyName);
        Assert.Equal("Maria", result.FirstName);
        Assert.Equal("maria@tech.com", result.EmailAddress);
        Assert.Equal("Recruiter", result.Role);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));

        var savedUser = await context.Users.SingleAsync(u => u.EmailAddress == "maria@tech.com");
        Assert.Equal("Recruiter", savedUser.Role);
        Assert.True(BCrypt.Net.BCrypt.Verify("P@ssw0rd!", savedUser.PasswordHash));

        var savedCompany = await context.Companies.SingleAsync(c => c.Name == "Tech Solutions Inc");
        Assert.Equal(result.CompanyId, savedCompany.CompanyId);

        var savedRecruiter = await context.Recruiters.SingleAsync(r => r.UserId == savedUser.UserId);
        Assert.Equal(savedRecruiter.CompanyId, savedCompany.CompanyId);
    }

    [Fact]
    public async Task CompanyRegisterAsync_DuplicateEmail_Throws()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        await service.CompanyRegisterAsync(NewCompanyRegisterRequest());

        var duplicateRequest = NewCompanyRegisterRequest() with { CompanyName = "Different Corp" };
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CompanyRegisterAsync(duplicateRequest));
    }

    [Fact]
    public async Task CompanyRegisterAsync_DuplicateCompanyName_Throws()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        await service.CompanyRegisterAsync(NewCompanyRegisterRequest());

        var duplicateRequest = NewCompanyRegisterRequest() with { EmailAddress = "maria2@tech.com" };
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CompanyRegisterAsync(duplicateRequest));
    }

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ReturnsToken()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);
        await service.RegisterAsync(NewRegisterRequest());

        var result = await service.LoginAsync(new LoginRequest("jose@example.com", "P@ssw0rd!"));

        Assert.Equal("jose@example.com", result.EmailAddress);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));
    }

    [Fact]
    public async Task LoginAsync_WithUnknownEmail_Throws()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.LoginAsync(new LoginRequest("ghost@example.com", "P@ssw0rd!")));
    }

    [Fact]
    public async Task LoginAsync_WithWrongPassword_Throws()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);
        await service.RegisterAsync(NewRegisterRequest());

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.LoginAsync(new LoginRequest("jose@example.com", "wrong-password")));
    }
}