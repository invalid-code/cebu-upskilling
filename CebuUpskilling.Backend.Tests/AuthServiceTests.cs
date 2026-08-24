using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class AuthServiceTests
{
    private class FakeGoogleAiService : IGoogleAiService
    {
        private readonly List<string> _skills;
        private readonly List<GeneratedAssessmentQuestion> _questions;

        public FakeGoogleAiService(List<string>? skills = null, List<GeneratedAssessmentQuestion>? questions = null)
        {
            _skills = skills ?? new List<string>();
            _questions = questions ?? new List<GeneratedAssessmentQuestion>();
        }

        public Task<List<string>> ParseSkillsFromResumeAsync(string resumeText, CancellationToken ct = default)
            => Task.FromResult(new List<string>(_skills));

        public Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(string skillName, int count = 5, CancellationToken ct = default)
            => Task.FromResult(new List<GeneratedAssessmentQuestion>(_questions));
    }
    private static IConfiguration CreateConfig() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-secret-key-that-is-at-least-32-characters-long",
            ["Jwt:Issuer"] = "CebuUpskilling",
            ["Jwt:Audience"] = "CebuUpskilling.Web"
        })
        .Build();

    private static AuthService CreateService(Data.ApplicationDbContext context, IGoogleAiService? aiService = null, IGoogleTokenVerifier? googleVerifier = null) => new(
        context,
        new JobseekerSkillParserAgent(
            aiService ?? new FakeGoogleAiService(),
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
        googleVerifier ?? new FakeGoogleTokenVerifier(),
        NullLogger<AuthService>.Instance
    );

    internal class FakeGoogleTokenVerifier : IGoogleTokenVerifier
    {
        public GoogleUserInfo? User { get; set; }
        public bool ThrowUnauthorized { get; set; }

        public Task<GoogleUserInfo> VerifyIdTokenAsync(string idToken)
        {
            if (ThrowUnauthorized || User == null)
            {
                throw new UnauthorizedAccessException("Invalid Google credential");
            }
            return Task.FromResult(User);
        }
    }

    private static RegisterRequest NewRegisterRequest() => new(
        FirstName: "Jose",
        LastName: "Rizal",
        MiddleName: null,
        Birthday: null,
        EmailAddress: "jose@example.com",
        Password: "P@ssw0rd!",
        Role: "Learner",
        Resume: "Experienced software developer."
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
    public async Task RegisterAsync_WithAddress_ParsesAndStoresAddressParts()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var request = NewRegisterRequest() with { Address = "88 Magallanes St, Cebu City, Cebu 6000, Philippines" };
        var result = await service.RegisterAsync(request);

        var saved = await context.Users.SingleAsync(u => u.EmailAddress == request.EmailAddress);
        Assert.Equal("88 Magallanes St", saved.Street);
        Assert.Equal("Cebu City", saved.City);
        Assert.Equal("Cebu", saved.Province);
        Assert.Equal("6000", saved.ZipCode);
        Assert.Equal("Philippines", saved.Country);

        Assert.Equal(saved.Street, result.Street);
        Assert.Equal(saved.City, result.City);
        Assert.Equal(saved.Province, result.Province);
        Assert.Equal(saved.ZipCode, result.ZipCode);
        Assert.Equal(saved.Country, result.Country);
    }

    [Fact]
    public async Task RegisterAsync_WithoutAddress_StoresNullParts()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.RegisterAsync(NewRegisterRequest());

        Assert.Null(result.Street);
        Assert.Null(result.City);
        Assert.Null(result.Province);
        Assert.Null(result.ZipCode);
        Assert.Null(result.Country);
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
    public async Task RegisterAsync_WithTargetRole_DoesNotCreateRoleLearnerSkills()
    {
        var context = TestDbContextFactory.Create();
        TestDataSeeder.Seed(context);
        var service = CreateService(context);

        var request = NewRegisterRequest() with { TargetRole = "Frontend Developer" };
        var result = await service.RegisterAsync(request);

        var learner = await context.Learners.SingleAsync(l => l.UserId == result.UserId);
        var learnerSkills = await context.LearnerSkills.Where(ls => ls.LearnerId == learner.LearnerId).ToListAsync();
        Assert.Empty(learnerSkills);
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
    public async Task RegisterAsync_WithResumeParsesAndSavesAllLearnerSkills()
    {
        var context = TestDbContextFactory.Create();

        context.Skills.Add(new Skill { Name = "JavaScript" });
        context.Skills.Add(new Skill { Name = "React" });
        context.Skills.Add(new Skill { Name = "Docker" });
        await context.SaveChangesAsync();

        var aiService = new FakeGoogleAiService(new List<string> { "JavaScript", "React", "NonExistent" });
        var service = CreateService(context, aiService);

        var result = await service.RegisterAsync(NewRegisterRequest());

        var learner = await context.Learners.SingleAsync(l => l.UserId == result.UserId);
        var learnerSkills = await context.LearnerSkills
            .Where(ls => ls.LearnerId == learner.LearnerId)
            .ToListAsync();

        Assert.Equal(3, learnerSkills.Count);
        var skillIds = learnerSkills.Select(ls => ls.SkillId).ToHashSet();
        var jsSkill = await context.Skills.SingleAsync(s => s.Name == "JavaScript");
        var reactSkill = await context.Skills.SingleAsync(s => s.Name == "React");
        var newSkill = await context.Skills.SingleAsync(s => s.Name == "NonExistent");
        Assert.Contains(jsSkill.SkillId, skillIds);
        Assert.Contains(reactSkill.SkillId, skillIds);
        Assert.Contains(newSkill.SkillId, skillIds);
    }

    [Fact]
    public async Task RegisterAsync_WithResume_CreatesAssessmentsForParsedSkills()
    {
        var context = TestDbContextFactory.Create();

        context.Skills.Add(new Skill { Name = "JavaScript" });
        context.Skills.Add(new Skill { Name = "React" });
        await context.SaveChangesAsync();

        var aiService = new FakeGoogleAiService(new List<string> { "JavaScript", "React" });
        var service = CreateService(context, aiService);

        var result = await service.RegisterAsync(NewRegisterRequest());

        var learner = await context.Learners.SingleAsync(l => l.UserId == result.UserId);
        var assessments = await context.LearnerAssessments
            .Where(a => a.LearnerId == learner.LearnerId)
            .ToListAsync();

        Assert.Equal(2, assessments.Count);
        Assert.All(assessments, a =>
        {
            Assert.Equal(0, a.ScoredLevel);
            Assert.False(a.Verified);
        });
    }

    [Fact]
    public async Task RegisterAsync_LearnerWithoutResume_Throws()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var request = NewRegisterRequest() with { Resume = null };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RegisterAsync(request));
        Assert.Equal("Resume is required for learners", ex.Message);
    }

    [Fact]
    public async Task CompanyRegisterAsync_CreatesCompanyAndLinksUser_ReturnsTokenAndCompanyInfo()
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

        Assert.Equal(savedUser.CompanyId, savedCompany.CompanyId);
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