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
    private class FakeOpenRouterService : IOpenRouterService
    {
        private readonly List<string> _skills;
        private readonly List<GeneratedAssessmentQuestion> _questions;

        public FakeOpenRouterService(List<string>? skills = null, List<GeneratedAssessmentQuestion>? questions = null)
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

    private static AuthService CreateService(Data.ApplicationDbContext context, IOpenRouterService? openRouterService = null) => new(
        new AppUserRepository(context),
        new LearnerRepository(context),
        new RoleSkillRepository(context),
        new LearnerSkillRepository(context),
        new SkillRepository(context),
        new AssessmentQuestionRepository(context),
        openRouterService ?? new FakeOpenRouterService(),
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
        Role: "Learner",
        Resume: "Experienced software developer."
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
        TestDataSeeder.Seed(context);
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
    public async Task RegisterAsync_WithResumeParsesAndCreatesLearnerSkills()
    {
        var context = TestDbContextFactory.Create();

        context.Skills.Add(new Skill { Name = "JavaScript" });
        context.Skills.Add(new Skill { Name = "React" });
        context.Skills.Add(new Skill { Name = "Docker" });
        await context.SaveChangesAsync();

        var openRouter = new FakeOpenRouterService(new List<string> { "JavaScript", "React", "NonExistent" });
        var service = CreateService(context, openRouter);

        var result = await service.RegisterAsync(NewRegisterRequest());

        var learner = await context.Learners.SingleAsync(l => l.UserId == result.UserId);
        var learnerSkills = await context.LearnerSkills
            .Where(ls => ls.LearnerId == learner.LearnerId)
            .ToListAsync();

        Assert.Equal(2, learnerSkills.Count);
        var skillIds = learnerSkills.Select(ls => ls.SkillId).ToHashSet();
        var jsSkill = await context.Skills.SingleAsync(s => s.Name == "JavaScript");
        var reactSkill = await context.Skills.SingleAsync(s => s.Name == "React");
        Assert.Contains(jsSkill.SkillId, skillIds);
        Assert.Contains(reactSkill.SkillId, skillIds);
    }

    [Fact]
    public async Task RegisterAsync_WithResume_GeneratesAssessmentQuestionsForParsedSkills()
    {
        var context = TestDbContextFactory.Create();

        context.Skills.Add(new Skill { Name = "JavaScript" });
        context.Skills.Add(new Skill { Name = "React" });
        await context.SaveChangesAsync();

        var generatedQuestions = new List<GeneratedAssessmentQuestion>
        {
            new("What is a closure?", "A", "B", "C", "D", 0),
            new("What is JSX?", "A", "B", "C", "D", 1),
        };
        var openRouter = new FakeOpenRouterService(
            new List<string> { "JavaScript", "React" },
            generatedQuestions);

        var service = CreateService(context, openRouter);

        await service.RegisterAsync(NewRegisterRequest());

        var saved = await context.AssessmentQuestions.ToListAsync();
        Assert.Equal(4, saved.Count);
        Assert.All(saved, q => Assert.Equal(AssessmentSource.AI, q.Source));
        var jsSkillId = (await context.Skills.SingleAsync(s => s.Name == "JavaScript")).SkillId;
        var reactSkillId = (await context.Skills.SingleAsync(s => s.Name == "React")).SkillId;
        Assert.Contains(saved, q => q.SkillId == jsSkillId);
        Assert.Contains(saved, q => q.SkillId == reactSkillId);
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
