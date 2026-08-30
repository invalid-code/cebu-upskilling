using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Options;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using CebuUpskilling.Backend.Validators;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Google sign-up / sign-in flows: a verified Google ID token either matches an
/// existing account (login) or provisions a new one (signup).
/// </summary>
public class GoogleAuthTests
{
    private static GoogleUserInfo GoogleUser(
        string email = "ana.google@example.com",
        string firstName = "Ana",
        string lastName = "Santos") => new("google-subject-123", email, firstName, lastName);

    private static AuthService CreateService(Data.ApplicationDbContext context, AuthServiceTests.FakeGoogleTokenVerifier verifier) => new(
        context,
        new JobseekerSkillParserAgent(
            new NoopAiService(),
            new SkillRepository(context),
            new LearnerRepository(context),
            new LearnerSkillRepository(context),
            new LearnerAssessmentRepository(context),
            new AppUserRepository(context),
            new RoleSkillRepository(context),
            new AssessmentQuestionRepository(context),
            NullLogger<JobseekerSkillParserAgent>.Instance),
        new JwtTokenService(CreateConfig(), NullLogger<JwtTokenService>.Instance),
        new LoggingEmailService(NullLogger<LoggingEmailService>.Instance),
        new InMemoryTokenRevocationStore(NullLogger<InMemoryTokenRevocationStore>.Instance),
        verifier,
        NullLogger<AuthService>.Instance
    );

    internal class NoopAiService : IGoogleAiService
    {
        public Task<List<string>> ParseSkillsFromResumeAsync(string t, CancellationToken ct = default) => Task.FromResult(new List<string>());
        public Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(string s, int c = 5, CancellationToken ct = default) => Task.FromResult(new List<GeneratedAssessmentQuestion>());
        public Task<List<CandidateRanking>> RankCandidatesAsync(string j, string r, string? req, List<CandidateSkillProfile> cands, CancellationToken ct = default) => Task.FromResult(new List<CandidateRanking>());
        public Task<DraftJobPostResponse?> DraftJobPostAsync(DraftJobPostRequest request, CancellationToken ct = default) => Task.FromResult<DraftJobPostResponse?>(null);
        public Task<CourseGenerationResult?> GenerateCourseOutlineAsync(CourseGenerationPromptContext context, CancellationToken ct = default) => Task.FromResult<CourseGenerationResult?>(null);
    }

    private static IConfiguration CreateConfig() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-secret-key-that-is-at-least-32-characters-long",
            ["Jwt:Issuer"] = "CebuUpskilling",
            ["Jwt:Audience"] = "CebuUpskilling.Web"
        })
        .Build();

    [Fact]
    public async Task GoogleAuthAsync_NewLearner_CreatesUserWithVerifiedEmailAndNoPassword()
    {
        var context = TestDbContextFactory.Create();
        var verifier = new AuthServiceTests.FakeGoogleTokenVerifier { User = GoogleUser() };
        var service = CreateService(context, verifier);

        var result = await service.GoogleAuthAsync(new GoogleAuthRequest("valid-id-token"));

        Assert.True(result.UserId > 0);
        Assert.Equal("ana.google@example.com", result.EmailAddress);
        Assert.Equal("Ana", result.FirstName);
        Assert.Equal("Santos", result.LastName);
        Assert.Equal("Learner", result.Role);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));

        var saved = await context.Users.SingleAsync(u => u.EmailAddress == "ana.google@example.com");
        Assert.True(saved.EmailConfirmed);
        Assert.Null(saved.PasswordHash);

        var learner = await context.Learners.SingleOrDefaultAsync(l => l.UserId == result.UserId);
        Assert.NotNull(learner);
    }

    [Fact]
    public async Task GoogleAuthAsync_NewRecruiter_CreatesRecruiterWithoutLearnerProfile()
    {
        var context = TestDbContextFactory.Create();
        var verifier = new AuthServiceTests.FakeGoogleTokenVerifier { User = GoogleUser() };
        var service = CreateService(context, verifier);

        var result = await service.GoogleAuthAsync(new GoogleAuthRequest("valid-id-token", Role: "Recruiter"));

        Assert.Equal("Recruiter", result.Role);
        Assert.Null(await context.Learners.SingleOrDefaultAsync(l => l.UserId == result.UserId));
    }

    [Fact]
    public async Task GoogleAuthAsync_NewUser_MissingNamesFallsBackToEmailPrefix()
    {
        var context = TestDbContextFactory.Create();
        var verifier = new AuthServiceTests.FakeGoogleTokenVerifier
        {
            User = new GoogleUserInfo("sub-1", "fallback.user@example.com", "", "")
        };
        var service = CreateService(context, verifier);

        var result = await service.GoogleAuthAsync(new GoogleAuthRequest("valid-id-token"));

        Assert.Equal("fallback.user", result.FirstName);
        Assert.Equal("", result.LastName);
    }

    [Fact]
    public async Task GoogleAuthAsync_ExistingUser_LogsInWithoutChangingAccount()
    {
        var context = TestDbContextFactory.Create();
        var existing = new AppUser
        {
            FirstName = "Jose",
            LastName = "Rizal",
            EmailAddress = "ana.google@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("P@ssw0rd!"),
            Role = "Recruiter",
            EmailConfirmed = false,
        };
        context.Users.Add(existing);
        await context.SaveChangesAsync();

        // Role hint must not override the existing account's role.
        var verifier = new AuthServiceTests.FakeGoogleTokenVerifier { User = GoogleUser() };
        var service = CreateService(context, verifier);

        var result = await service.GoogleAuthAsync(new GoogleAuthRequest("valid-id-token", Role: "Learner"));

        Assert.Equal(existing.UserId, result.UserId);
        Assert.Equal("Recruiter", result.Role);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));
        Assert.Null(await context.Learners.SingleOrDefaultAsync(l => l.UserId == existing.UserId));

        var refreshed = await context.Users.SingleAsync(u => u.UserId == existing.UserId);
        Assert.False(refreshed.EmailConfirmed);
        Assert.NotNull(refreshed.PasswordHash);
    }

    [Fact]
    public async Task GoogleAuthAsync_InvalidToken_ThrowsUnauthorized()
    {
        var context = TestDbContextFactory.Create();
        var verifier = new AuthServiceTests.FakeGoogleTokenVerifier { ThrowUnauthorized = true };
        var service = CreateService(context, verifier);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.GoogleAuthAsync(new GoogleAuthRequest("forged-token")));
        Assert.Empty(await context.Users.ToListAsync());
    }

    [Fact]
    public async Task GoogleAuthAsync_InvalidRole_Throws()
    {
        var context = TestDbContextFactory.Create();
        var verifier = new AuthServiceTests.FakeGoogleTokenVerifier { User = GoogleUser() };
        var service = CreateService(context, verifier);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GoogleAuthAsync(new GoogleAuthRequest("valid-id-token", Role: "Admin")));
        Assert.Contains("not allowed", ex.Message);
        Assert.Empty(await context.Users.ToListAsync());
    }

    [Fact]
    public async Task GoogleAuthAsync_ReturnedToken_CarriesCorrectClaims()
    {
        var context = TestDbContextFactory.Create();
        var verifier = new AuthServiceTests.FakeGoogleTokenVerifier { User = GoogleUser() };
        var service = CreateService(context, verifier);

        var result = await service.GoogleAuthAsync(new GoogleAuthRequest("valid-id-token"));

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(result.Token);
        Assert.Equal("CebuUpskilling", jwt.Issuer);
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.Email && c.Value == "ana.google@example.com");
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.Role && c.Value == "Learner");
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.NameIdentifier && c.Value == result.UserId.ToString());
    }

    [Fact]
    public async Task LoginAsync_GoogleOnlyAccountWithoutPassword_ReturnsInvalidCredentials()
    {
        var context = TestDbContextFactory.Create();
        var googleOnly = new AppUser
        {
            FirstName = "Ana",
            LastName = "Santos",
            EmailAddress = "google.only@example.com",
            PasswordHash = null,
            Role = "Learner",
            EmailConfirmed = true,
        };
        context.Users.Add(googleOnly);
        await context.SaveChangesAsync();

        var service = CreateService(context, new AuthServiceTests.FakeGoogleTokenVerifier());

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.LoginAsync(new LoginRequest("google.only@example.com", "any-password")));
    }

    [Fact]
    public async Task ResetPassword_ForGoogleOnlyAccount_EnablesPasswordLoginAfterwards()
    {
        var context = TestDbContextFactory.Create();
        var googleOnly = new AppUser
        {
            FirstName = "Ana",
            LastName = "Santos",
            EmailAddress = "upgrade.to.password@example.com",
            PasswordHash = null,
            Role = "Learner",
            EmailConfirmed = true,
        };
        context.Users.Add(googleOnly);
        await context.SaveChangesAsync();

        // Seed a known reset token directly (same hashing scheme AuthService uses).
        var token = "known-reset-token";
        googleOnly.PasswordResetTokenHash = HashToken(token);
        googleOnly.PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(30);
        await context.SaveChangesAsync();

        var service = CreateService(context, new AuthServiceTests.FakeGoogleTokenVerifier());

        Assert.True(await service.ResetPasswordAsync(googleOnly.EmailAddress, token, "NewP@ssw0rd!"));

        // The account can now also log in with the password.
        var login = await service.LoginAsync(new LoginRequest(googleOnly.EmailAddress, "NewP@ssw0rd!"));
        Assert.False(string.IsNullOrWhiteSpace(login.Token));
    }

    private static string HashToken(string raw)
    {
        var bytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    [Fact]
    public void GoogleAuthRequestValidator_EmptyToken_Fails()
    {
        var validator = new GoogleAuthRequestValidator();
        var result = validator.Validate(new GoogleAuthRequest(""));
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("learner")]
    public void GoogleAuthRequestValidator_InvalidRole_Fails(string role)
    {
        var validator = new GoogleAuthRequestValidator();
        var result = validator.Validate(new GoogleAuthRequest("token", role));
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("Learner")]
    [InlineData("Recruiter")]
    [InlineData("CourseProvider")]
    public void GoogleAuthRequestValidator_ValidRequests_Pass(string? role)
    {
        var validator = new GoogleAuthRequestValidator();
        var result = validator.Validate(new GoogleAuthRequest("token", role));
        Assert.True(result.IsValid);
    }

    [Fact]
    public async Task GoogleAuthAsync_NewCourseProvider_CreatesCourseProviderWithoutLearnerProfile()
    {
        var context = TestDbContextFactory.Create();
        var verifier = new AuthServiceTests.FakeGoogleTokenVerifier { User = GoogleUser() };
        var service = CreateService(context, verifier);

        var result = await service.GoogleAuthAsync(new GoogleAuthRequest("valid-id-token", Role: "CourseProvider"));

        Assert.Equal("CourseProvider", result.Role);
        Assert.Null(await context.Learners.SingleOrDefaultAsync(l => l.UserId == result.UserId));
        var saved = await context.Users.SingleAsync(u => u.UserId == result.UserId);
        Assert.Equal("CourseProvider", saved.Role);
    }

    [Fact]
    public async Task GoogleTokenVerifier_NotConfigured_ThrowsHelpfulError()
    {
        var verifier = new GoogleTokenVerifier(
            Microsoft.Extensions.Options.Options.Create(new GoogleOAuthOptions { ClientId = "" }),
            NullLogger<GoogleTokenVerifier>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => verifier.VerifyIdTokenAsync("some-token"));
        Assert.Contains("GoogleOAuth:ClientId", ex.Message);
    }
}
