using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Tests for the unified <see cref="JobseekerSkillParserAgent"/> which merged
/// <c>ISkillParsingService</c> and <c>IAssessmentService</c>. These mirror the
/// legacy <see cref="SkillParsingServiceTests"/> and <see cref="AssessmentServiceTests"/>
/// but exercise the new agent, including the post-Recruiter-entity removal where
/// company association is via <c>AppUser.CompanyId</c> directly.
/// </summary>
public class JobseekerSkillParserAgentTests
{
    private class FakeGoogleAiService : IGoogleAiService
    {
        private readonly List<string> _skills;
        public List<GeneratedAssessmentQuestion>? Questions { get; set; }
        public int GenerationCalls { get; private set; }

        public FakeGoogleAiService(List<string>? skills = null, List<GeneratedAssessmentQuestion>? questions = null)
        {
            _skills = skills ?? new List<string>();
            Questions = questions;
        }

        public Task<List<string>> ParseSkillsFromResumeAsync(string resumeText, CancellationToken ct = default)
            => Task.FromResult(new List<string>(_skills));

        public Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(string skillName, int count = 5, CancellationToken ct = default)
        {
            GenerationCalls++;
            return Task.FromResult(Questions ?? new List<GeneratedAssessmentQuestion>());
        }

        public Task<List<CandidateRanking>> RankCandidatesAsync(string jobTitle, string targetRole, string? requirements, List<CandidateSkillProfile> candidates, CancellationToken ct = default)
            => Task.FromResult(new List<CandidateRanking>());

        public Task<DraftJobPostResponse?> DraftJobPostAsync(DraftJobPostRequest request, CancellationToken ct = default)
            => Task.FromResult<DraftJobPostResponse?>(null);

        public Task<CourseGenerationResult?> GenerateCourseOutlineAsync(CourseGenerationPromptContext context, CancellationToken ct = default)
            => Task.FromResult<CourseGenerationResult?>(null);
    }

    private static JobseekerSkillParserAgent CreateAgent(ApplicationDbContext context, FakeGoogleAiService ai) => new(
        ai,
        new SkillRepository(context),
        new LearnerRepository(context),
        new LearnerSkillRepository(context),
        new LearnerAssessmentRepository(context),
        new AppUserRepository(context),
        new RoleSkillRepository(context),
        new AssessmentQuestionRepository(context),
        NullLogger<JobseekerSkillParserAgent>.Instance
    );

    private static async Task<(AppUser User, Learner Learner)> CreateLearnerAsync(ApplicationDbContext context)
    {
        var user = new AppUser
        {
            FirstName = "Jose",
            LastName = "Rizal",
            EmailAddress = $"learner-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Learner",
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);
        await context.SaveChangesAsync();
        return (user, learner);
    }

    private static List<GeneratedAssessmentQuestion> SampleQuestions() => new()
    {
        new GeneratedAssessmentQuestion("What does the typeof operator return for null?", "object", "null", "undefined", "boolean", 0),
        new GeneratedAssessmentQuestion("Which keyword declares a block-scoped variable?", "var", "let", "const", "function", 1),
        new GeneratedAssessmentQuestion("Which array method returns a new array with elements that pass a test?", "map", "filter", "reduce", "forEach", 1),
        new GeneratedAssessmentQuestion("What is the result of 2 + '2'?", "4", "22", "NaN", "TypeError", 1),
        new GeneratedAssessmentQuestion("Which statement creates a Promise that resolves immediately?", "Promise.reject()", "Promise.resolve()", "new Promise()", "async()", 1),
    };

    // -----------------------------------------------------------------
    // Skill parsing via the agent
    // -----------------------------------------------------------------

    [Fact]
    public async Task ParseAndCreateAssessmentsAsync_WhenNoSkillsParsed_ReturnsEmptyResult()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);
        var agent = CreateAgent(context, new FakeGoogleAiService(new List<string>()));

        var result = await agent.ParseAndCreateAssessmentsAsync(user.UserId, "resume");

        Assert.Empty(result.Skills);
        Assert.Empty(context.Skills);
        Assert.Empty(context.LearnerSkills);
        Assert.Empty(context.LearnerAssessments);
    }

    [Fact]
    public async Task ParseAndCreateAssessmentsAsync_CreatesSkillsLearnerSkillsAndAssessments()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var agent = CreateAgent(context, new FakeGoogleAiService(new List<string> { "JavaScript", "React" }));

        var result = await agent.ParseAndCreateAssessmentsAsync(user.UserId, "resume");

        Assert.Equal(2, result.Skills.Count);
        Assert.All(result.Skills, s => Assert.NotNull(s.AssessmentId));
        Assert.Equal(2, context.Skills.Count());
        Assert.Equal(2, context.LearnerSkills.Count(ls => ls.LearnerId == learner.LearnerId));
        Assert.Equal(2, context.LearnerAssessments.Count(a => a.LearnerId == learner.LearnerId));
    }

    [Fact]
    public async Task ParseAndCreateAssessmentsAsync_ReusesExistingSkills_WithoutDuplicating()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);
        var existing = new Skill { Name = "JavaScript", Category = "Language" };
        context.Skills.Add(existing);
        await context.SaveChangesAsync();

        var agent = CreateAgent(context, new FakeGoogleAiService(new List<string> { "JavaScript" }));
        var result = await agent.ParseAndCreateAssessmentsAsync(user.UserId, "resume");

        var parsed = Assert.Single(result.Skills);
        Assert.Equal(existing.SkillId, parsed.SkillId);
        Assert.Single(context.Skills);
    }

    [Fact]
    public async Task ParseAndCreateAssessmentsAsync_NormalizesAndDeduplicatesNames()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);
        var agent = CreateAgent(context, new FakeGoogleAiService(new List<string> { "javascript", "JavaScript", "  React  " }));

        var result = await agent.ParseAndCreateAssessmentsAsync(user.UserId, "resume");

        Assert.Equal(2, result.Skills.Count);
        Assert.Contains(result.Skills, s => s.SkillName == "javascript");
        Assert.Contains(result.Skills, s => s.SkillName == "React");
        Assert.Equal(2, context.Skills.Count());
    }

    [Fact]
    public async Task ParseAndCreateAssessmentsAsync_WhenNoLearnerProfile_ReturnsResultsWithoutAssessmentIds()
    {
        var context = TestDbContextFactory.Create();
        var user = new AppUser { FirstName = "No", LastName = "Learner", EmailAddress = $"user-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Learner" };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var agent = CreateAgent(context, new FakeGoogleAiService(new List<string> { "Python" }));
        var result = await agent.ParseAndCreateAssessmentsAsync(user.UserId, "resume");

        var parsed = Assert.Single(result.Skills);
        Assert.Equal("Python", parsed.SkillName);
        Assert.Null(parsed.AssessmentId);
        Assert.Single(context.Skills);
        Assert.Empty(context.LearnerAssessments);
    }

    [Fact]
    public async Task ParseAndCreateAssessmentsAsync_DoesNotCreateDuplicateAssessmentForExistingSkill()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var skill = new Skill { Name = "Python", Category = "Language" };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();
        context.LearnerAssessments.Add(new LearnerAssessment { LearnerId = learner.LearnerId, SkillId = skill.SkillId, ScoredLevel = 4, Verified = true, CompletedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var agent = CreateAgent(context, new FakeGoogleAiService(new List<string> { "Python" }));
        var result = await agent.ParseAndCreateAssessmentsAsync(user.UserId, "resume");

        var parsed = Assert.Single(result.Skills);
        Assert.Null(parsed.AssessmentId);
        Assert.Equal(1, context.LearnerAssessments.Count(a => a.LearnerId == learner.LearnerId));
    }

    // -----------------------------------------------------------------
    // Assessment lifecycle via the agent (covers the merged company-question path)
    // -----------------------------------------------------------------

    private static async Task<(JobseekerSkillParserAgent Agent, int UserId)> CreateLearnerWithSkillAsync(
        ApplicationDbContext context, FakeGoogleAiService ai)
    {
        var user = new AppUser { FirstName = "Jose", LastName = "Rizal", EmailAddress = $"learner-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Learner", TargetRole = "Frontend Developer" };
        context.Users.Add(user);
        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);
        var skill = new Skill { Name = "JavaScript", Category = "Frontend" };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();
        var agent = CreateAgent(context, ai);
        var start = await agent.StartAssessmentAsync(user.UserId, new StartAssessmentRequest(skill.SkillId));
        Assert.NotNull(start);
        return (agent, user.UserId);
    }

    [Fact]
    public async Task CreateCompanyQuestionAsync_ViaAgent_ByRecruiter_WithCompanyId_CreatesAndTagsCompanyQuestion()
    {
        var context = TestDbContextFactory.Create();
        var skill = new Skill { Name = "React", Category = "Frontend" };
        context.Skills.Add(skill);
        var company = new Company { Name = "Acme Corp" };
        context.Companies.Add(company);
        var recruiterUser = new AppUser { FirstName = "Recruiter", LastName = "User", EmailAddress = $"recruiter-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Recruiter" };
        context.Users.Add(recruiterUser);
        await context.SaveChangesAsync();
        recruiterUser.CompanyId = company.CompanyId;
        await context.SaveChangesAsync();

        var agent = CreateAgent(context, new FakeGoogleAiService());
        var request = new CreateCompanyQuestionRequest(skill.SkillId, "What is a React hook?", "A", "B", "C", "D", 0);

        var result = await agent.CreateCompanyQuestionAsync(recruiterUser.UserId, request);

        Assert.NotNull(result);
        Assert.Equal("Company", result!.Source);
        Assert.Equal("Acme Corp", result.CompanyName);
        var saved = await context.AssessmentQuestions.SingleAsync(q => q.SkillId == skill.SkillId);
        Assert.Equal(AssessmentSource.Company, saved.Source);
        Assert.Equal(company.CompanyId, saved.CompanyId);
    }

    [Fact]
    public async Task CreateCompanyQuestionAsync_ViaAgent_ByNonRecruiter_OrUserWithoutCompany_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var skill = new Skill { Name = "React", Category = "Frontend" };
        context.Skills.Add(skill);
        var learnerUser = new AppUser { FirstName = "Learner", LastName = "User", EmailAddress = $"learner-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Learner" };
        context.Users.Add(learnerUser);
        await context.SaveChangesAsync();

        var agent = CreateAgent(context, new FakeGoogleAiService());
        var request = new CreateCompanyQuestionRequest(skill.SkillId, "Question?", "A", "B", "C", "D", 0);

        var result = await agent.CreateCompanyQuestionAsync(learnerUser.UserId, request);

        Assert.Null(result);
        Assert.Empty(await context.AssessmentQuestions.ToListAsync());
    }

    [Fact]
    public async Task CreateCompanyQuestionAsync_ViaAgent_RecruiterWithoutCompany_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var skill = new Skill { Name = "React", Category = "Frontend" };
        context.Skills.Add(skill);
        var recruiterUser = new AppUser { FirstName = "Recruiter", LastName = "User", EmailAddress = $"recruiter-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Recruiter", CompanyId = null };
        context.Users.Add(recruiterUser);
        await context.SaveChangesAsync();

        var agent = CreateAgent(context, new FakeGoogleAiService());
        var request = new CreateCompanyQuestionRequest(skill.SkillId, "Question?", "A", "B", "C", "D", 0);

        var result = await agent.CreateCompanyQuestionAsync(recruiterUser.UserId, request);

        Assert.Null(result);
        Assert.Empty(await context.AssessmentQuestions.ToListAsync());
    }

    [Fact]
    public async Task GetQuestionsAsync_WhenNoQuestionsExist_GeneratesViaAgent()
    {
        var context = TestDbContextFactory.Create();
        var ai = new FakeGoogleAiService(questions: SampleQuestions());
        var (agent, userId) = await CreateLearnerWithSkillAsync(context, ai);
        var assessment = await context.LearnerAssessments.SingleAsync(a => a.Learner.UserId == userId);

        var result = await agent.GetQuestionsAsync(userId, assessment.LearnerAssessmentId);

        Assert.NotNull(result);
        Assert.Equal(5, result!.Questions.Count);
        Assert.Equal("AI-generated", result.Source);
        Assert.Equal(1, ai.GenerationCalls);
    }

    [Fact]
    public async Task GetAvailableAssessmentsAsync_ViaAgent_WithNoTargetRole_ReturnsParsedSkillAssessments()
    {
        var context = TestDbContextFactory.Create();
        var agent = CreateAgent(context, new FakeGoogleAiService());
        var user = new AppUser { FirstName = "Jose", LastName = "Rizal", EmailAddress = $"learner-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Learner", TargetRole = null };
        context.Users.Add(user);
        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);
        var skill = new Skill { Name = "TypeScript", Category = "Frontend" };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();
        context.LearnerSkills.Add(new LearnerSkill { LearnerId = learner.LearnerId, SkillId = skill.SkillId, CurrentLevel = 0, Verified = false });
        context.LearnerAssessments.Add(new LearnerAssessment { LearnerId = learner.LearnerId, SkillId = skill.SkillId, ScoredLevel = 0, Verified = false, CompletedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var result = await agent.GetAvailableAssessmentsAsync(user.UserId);

        Assert.NotNull(result);
        var assessment = Assert.Single(result!.Assessments);
        Assert.Equal("TypeScript", assessment.SkillName);
        Assert.False(assessment.HasAssessment);
    }
}
