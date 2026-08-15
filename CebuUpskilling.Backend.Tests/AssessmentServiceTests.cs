using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class AssessmentServiceTests
{
    private class FakeGoogleAiService : IGoogleAiService
    {
        public int GenerationCalls { get; private set; }

        public List<GeneratedAssessmentQuestion>? Questions { get; set; }

        public Task<List<string>> ParseSkillsFromResumeAsync(string resumeText, CancellationToken ct = default)
            => Task.FromResult(new List<string>());

        public Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(string skillName, int count = 5, CancellationToken ct = default)
        {
            GenerationCalls++;
            return Task.FromResult(Questions ?? new List<GeneratedAssessmentQuestion>());
        }
    }

    private static AssessmentService CreateService(ApplicationDbContext context, FakeGoogleAiService aiService) => new(
        new AppUserRepository(context),
        new RoleSkillRepository(context),
        new LearnerRepository(context),
        new LearnerSkillRepository(context),
        new LearnerAssessmentRepository(context),
        new AssessmentQuestionRepository(context),
        new SkillRepository(context),
        new RecruiterRepository(context),
        aiService,
        NullLogger<AssessmentService>.Instance
    );

    private static async Task<(AssessmentService Service, int UserId)> CreateLearnerWithSkillAsync(
        ApplicationDbContext context,
        FakeGoogleAiService aiService)
    {
        var user = new AppUser
        {
            FirstName = "Jose",
            LastName = "Rizal",
            EmailAddress = $"learner-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Learner",
            TargetRole = "Frontend Developer",
        };
        context.Users.Add(user);

        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);

        var skill = new Skill { Name = "JavaScript", Category = "Frontend" };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();

        var service = CreateService(context, aiService);
        var start = await service.StartAssessmentAsync(user.UserId, new StartAssessmentRequest(skill.SkillId));
        Assert.NotNull(start);

        return (service, user.UserId);
    }

    private static List<GeneratedAssessmentQuestion> SampleQuestions() => new()
    {
        new GeneratedAssessmentQuestion(
            "What does the typeof operator return for null?",
            "object", "null", "undefined", "boolean",
            0),
        new GeneratedAssessmentQuestion(
            "Which keyword declares a block-scoped variable?",
            "var", "let", "const", "function",
            1),
        new GeneratedAssessmentQuestion(
            "Which array method returns a new array with elements that pass a test?",
            "map", "filter", "reduce", "forEach",
            1),
        new GeneratedAssessmentQuestion(
            "What is the result of 2 + '2'?",
            "4", "22", "NaN", "TypeError",
            1),
        new GeneratedAssessmentQuestion(
            "Which statement creates a Promise that resolves immediately?",
            "Promise.reject()", "Promise.resolve()", "new Promise()", "async()",
            1),
    };

    [Fact]
    public async Task GetQuestionsAsync_WhenNoQuestionsExist_GeneratesAndPersistsAITargetedQuestions()
    {
        var context = TestDbContextFactory.Create();
        var aiService = new FakeGoogleAiService { Questions = SampleQuestions() };
        var (service, userId) = await CreateLearnerWithSkillAsync(context, aiService);

        var skill = await context.Skills.SingleAsync(s => s.Name == "JavaScript");
        var assessment = await context.LearnerAssessments.SingleAsync(a => a.Learner.UserId == userId);

        var result = await service.GetQuestionsAsync(userId, assessment.LearnerAssessmentId);

        Assert.NotNull(result);
        Assert.Equal("JavaScript", result!.SkillName);
        Assert.Equal(5, result.Questions.Count);
        Assert.Equal("AI-generated", result.Source);
        Assert.Null(result.CompanyName);
        Assert.True(result.Proctored);
        Assert.All(result.Questions, q =>
        {
            Assert.Equal("AI-generated", q.Source);
            Assert.Null(q.CompanyName);
        });
        Assert.Equal(1, aiService.GenerationCalls);

        var saved = await context.AssessmentQuestions
            .Where(q => q.SkillId == skill.SkillId)
            .ToListAsync();
        Assert.Equal(5, saved.Count);
        Assert.All(saved, q =>
        {
            Assert.False(string.IsNullOrWhiteSpace(q.Text));
            Assert.False(string.IsNullOrWhiteSpace(q.OptionA));
            Assert.False(string.IsNullOrWhiteSpace(q.OptionB));
            Assert.False(string.IsNullOrWhiteSpace(q.OptionC));
            Assert.False(string.IsNullOrWhiteSpace(q.OptionD));
            Assert.InRange(q.CorrectOption, 0, 3);
        });
    }

    [Fact]
    public async Task GetQuestionsAsync_WhenQuestionsExist_ReusesStoredQuestionsWithoutCallingAI()
    {
        var context = TestDbContextFactory.Create();
        var aiService = new FakeGoogleAiService { Questions = SampleQuestions() };
        var (service, userId) = await CreateLearnerWithSkillAsync(context, aiService);

        var skill = await context.Skills.SingleAsync(s => s.Name == "JavaScript");
        context.AssessmentQuestions.Add(new AssessmentQuestion
        {
            SkillId = skill.SkillId,
            Text = "Pre-seeded question",
            OptionA = "A", OptionB = "B", OptionC = "C", OptionD = "D",
            CorrectOption = 0,
        });
        await context.SaveChangesAsync();

        var assessment = await context.LearnerAssessments.SingleAsync(a => a.Learner.UserId == userId);

        var result = await service.GetQuestionsAsync(userId, assessment.LearnerAssessmentId);

        Assert.NotNull(result);
        Assert.Single(result!.Questions);
        Assert.Equal(0, aiService.GenerationCalls);
    }

    [Fact]
    public async Task GetQuestionsAsync_WhenAIGenerationReturnsNothing_ReturnsEmptyQuestions()
    {
        var context = TestDbContextFactory.Create();
        var aiService = new FakeGoogleAiService { Questions = new List<GeneratedAssessmentQuestion>() };
        var (service, userId) = await CreateLearnerWithSkillAsync(context, aiService);

        var assessment = await context.LearnerAssessments.SingleAsync(a => a.Learner.UserId == userId);

        var result = await service.GetQuestionsAsync(userId, assessment.LearnerAssessmentId);

        Assert.NotNull(result);
        Assert.Empty(result!.Questions);
        Assert.Equal(1, aiService.GenerationCalls);
    }

    [Fact]
    public async Task GetAvailableAssessmentsAsync_WithNoTargetRole_ReturnsParsedSkillAssessments()
    {
        var context = TestDbContextFactory.Create();
        var aiService = new FakeGoogleAiService();
        var service = CreateService(context, aiService);

        var user = new AppUser
        {
            FirstName = "Jose",
            LastName = "Rizal",
            EmailAddress = $"learner-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Learner",
            TargetRole = null,
        };
        context.Users.Add(user);

        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);

        var skill = new Skill { Name = "TypeScript", Category = "Frontend" };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();

        context.LearnerSkills.Add(new LearnerSkill
        {
            LearnerId = learner.LearnerId,
            SkillId = skill.SkillId,
            CurrentLevel = 0,
            Verified = false,
        });
        context.LearnerAssessments.Add(new LearnerAssessment
        {
            LearnerId = learner.LearnerId,
            SkillId = skill.SkillId,
            ScoredLevel = 0,
            Verified = false,
            CompletedAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var result = await service.GetAvailableAssessmentsAsync(user.UserId);

        Assert.NotNull(result);
        var assessment = Assert.Single(result!.Assessments);
        Assert.Equal("TypeScript", assessment.SkillName);
        Assert.False(assessment.HasAssessment);
        Assert.Equal(0, result.MatchPercent);
        Assert.Equal(0, result.RecommendedCount);
    }

    [Fact]
    public async Task GetAvailableAssessmentsAsync_WithNoTargetRole_VerifiedAssessmentShowsRetake()
    {
        var context = TestDbContextFactory.Create();
        var aiService = new FakeGoogleAiService();
        var service = CreateService(context, aiService);

        var user = new AppUser
        {
            FirstName = "Jose",
            LastName = "Rizal",
            EmailAddress = $"learner-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Learner",
            TargetRole = null,
        };
        context.Users.Add(user);

        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);

        var skill = new Skill { Name = "TypeScript", Category = "Frontend" };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();

        context.LearnerSkills.Add(new LearnerSkill
        {
            LearnerId = learner.LearnerId,
            SkillId = skill.SkillId,
            CurrentLevel = 0,
            Verified = false,
        });
        context.LearnerAssessments.Add(new LearnerAssessment
        {
            LearnerId = learner.LearnerId,
            SkillId = skill.SkillId,
            ScoredLevel = 0,
            Verified = true,
            CompletedAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var result = await service.GetAvailableAssessmentsAsync(user.UserId);

        Assert.NotNull(result);
        var assessment = Assert.Single(result!.Assessments);
        Assert.Equal("TypeScript", assessment.SkillName);
        Assert.True(assessment.HasAssessment);
    }

    [Fact]
    public async Task GetAvailableAssessmentsAsync_WithTargetRole_ReturnsRoleAndParsedSkillAssessments()
    {
        var context = TestDbContextFactory.Create();
        var aiService = new FakeGoogleAiService();
        var service = CreateService(context, aiService);

        var roleSkill = new Skill { Name = "JavaScript", Category = "Frontend" };
        var parsedSkill = new Skill { Name = "TypeScript", Category = "Frontend" };
        context.Skills.Add(roleSkill);
        context.Skills.Add(parsedSkill);
        await context.SaveChangesAsync();

        var user = new AppUser
        {
            FirstName = "Jose",
            LastName = "Rizal",
            EmailAddress = $"learner-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Learner",
            TargetRole = "Frontend Developer",
        };
        context.Users.Add(user);

        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);
        await context.SaveChangesAsync();

        context.RoleSkills.Add(new RoleSkill
        {
            TargetRole = "Frontend Developer",
            SkillId = roleSkill.SkillId,
            RequiredLevel = 3,
        });
        context.LearnerSkills.Add(new LearnerSkill
        {
            LearnerId = learner.LearnerId,
            SkillId = parsedSkill.SkillId,
            CurrentLevel = 0,
            Verified = false,
        });
        await context.SaveChangesAsync();

        var result = await service.GetAvailableAssessmentsAsync(user.UserId);

        Assert.NotNull(result);
        Assert.Equal(2, result!.Assessments.Count);
        Assert.Contains(result.Assessments, a => a.SkillName == "JavaScript" && a.TargetLevel == 3 && a.Gap == 3);
        Assert.Contains(result.Assessments, a => a.SkillName == "TypeScript" && a.Gap == 0);
    }

    [Fact]
    public async Task GetQuestionsAsync_WhenCompanyQuestionsExist_PrefersCompanyQuestions()
    {
        var context = TestDbContextFactory.Create();
        var aiService = new FakeGoogleAiService { Questions = SampleQuestions() };
        var (service, userId) = await CreateLearnerWithSkillAsync(context, aiService);

        var skill = await context.Skills.SingleAsync(s => s.Name == "JavaScript");
        var company = new Company { Name = "Acme Corp" };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        context.AssessmentQuestions.Add(new AssessmentQuestion
        {
            SkillId = skill.SkillId,
            Text = "Company-authored question?",
            OptionA = "A", OptionB = "B", OptionC = "C", OptionD = "D",
            CorrectOption = 0,
            Source = AssessmentSource.Company,
            CompanyId = company.CompanyId,
        });
        await context.SaveChangesAsync();

        var assessment = await context.LearnerAssessments.SingleAsync(a => a.Learner.UserId == userId);

        var result = await service.GetQuestionsAsync(userId, assessment.LearnerAssessmentId);

        Assert.NotNull(result);
        Assert.Single(result!.Questions);
        Assert.Equal("Company", result.Source);
        Assert.Equal("Acme Corp", result.CompanyName);
        Assert.False(result.Proctored);
        Assert.Equal("Company", result.Questions[0].Source);
        Assert.Equal("Acme Corp", result.Questions[0].CompanyName);
        Assert.Equal(0, aiService.GenerationCalls);
    }

    [Fact]
    public async Task CreateCompanyQuestionAsync_ByRecruiter_CreatesAndTagsCompanyQuestion()
    {
        var context = TestDbContextFactory.Create();
        var aiService = new FakeGoogleAiService();
        var service = CreateService(context, aiService);

        var skill = new Skill { Name = "React", Category = "Frontend" };
        context.Skills.Add(skill);
        var company = new Company { Name = "Acme Corp" };
        context.Companies.Add(company);
        var recruiterUser = new AppUser
        {
            FirstName = "Recruiter", LastName = "User",
            EmailAddress = $"recruiter-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash", Role = "Recruiter",
        };
        context.Users.Add(recruiterUser);
        await context.SaveChangesAsync();

        context.Recruiters.Add(new Recruiter { UserId = recruiterUser.UserId, CompanyId = company.CompanyId });
        await context.SaveChangesAsync();

        var request = new CreateCompanyQuestionRequest(
            SkillId: skill.SkillId,
            Text: "What is a React hook?",
            OptionA: "A", OptionB: "B", OptionC: "C", OptionD: "D",
            CorrectOption: 0
        );

        var result = await service.CreateCompanyQuestionAsync(recruiterUser.UserId, request);

        Assert.NotNull(result);
        Assert.Equal("Company", result!.Source);
        Assert.Equal("Acme Corp", result.CompanyName);

        var saved = await context.AssessmentQuestions.SingleAsync(q => q.SkillId == skill.SkillId);
        Assert.Equal(AssessmentSource.Company, saved.Source);
        Assert.Equal(company.CompanyId, saved.CompanyId);
        Assert.Equal("What is a React hook?", saved.Text);
    }

    [Fact]
    public async Task CreateCompanyQuestionAsync_ByNonRecruiter_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var aiService = new FakeGoogleAiService();
        var service = CreateService(context, aiService);

        var skill = new Skill { Name = "React", Category = "Frontend" };
        context.Skills.Add(skill);
        var learnerUser = new AppUser
        {
            FirstName = "Learner", LastName = "User",
            EmailAddress = $"learner-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash", Role = "Learner",
        };
        context.Users.Add(learnerUser);
        await context.SaveChangesAsync();

        var request = new CreateCompanyQuestionRequest(
            SkillId: skill.SkillId,
            Text: "Question?",
            OptionA: "A", OptionB: "B", OptionC: "C", OptionD: "D",
            CorrectOption: 0
        );

        var result = await service.CreateCompanyQuestionAsync(learnerUser.UserId, request);

        Assert.Null(result);
        Assert.Empty(await context.AssessmentQuestions.ToListAsync());
    }
}
