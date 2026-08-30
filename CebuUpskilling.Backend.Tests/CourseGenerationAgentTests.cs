using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class CourseGenerationAgentTests
{
    private sealed class FakeGoogleAiService : IGoogleAiService
    {
        public CourseGenerationResult? CourseResult { get; set; }
        public int GenerateCalls { get; private set; }
        public CourseGenerationPromptContext? LastContext { get; private set; }

        public Task<List<string>> ParseSkillsFromResumeAsync(string resumeText, CancellationToken ct = default) => Task.FromResult(new List<string>());
        public Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(string skillName, int count = 5, CancellationToken ct = default) => Task.FromResult(new List<GeneratedAssessmentQuestion>());
        public Task<CourseGenerationResult?> GenerateCourseOutlineAsync(CourseGenerationPromptContext context, CancellationToken ct = default)
        {
            GenerateCalls++;
            LastContext = context;
            return Task.FromResult(CourseResult);
        }

        public Task<List<CandidateRanking>> RankCandidatesAsync(string jobTitle, string targetRole, string? requirements, List<CandidateSkillProfile> candidates, CancellationToken ct = default) => Task.FromResult(new List<CandidateRanking>());

        public Task<DraftJobPostResponse?> DraftJobPostAsync(DraftJobPostRequest request, CancellationToken ct = default) => Task.FromResult<DraftJobPostResponse?>(null);
    }

    private static CourseGenerationResult SampleDraft(List<CourseGenerationSkillMatch>? matched = null)
        => new(
            Name: "AI-Generated Customer Support",
            Description: "Covers support fundamentals",
            TechnicalLevel: 2,
            Mode: "Online",
            Rationale: "Matches brief",
            Modules: new List<CourseGenerationModuleDraft>
            {
                new("Module A", "Purpose A", 0, new List<CourseGenerationLessonDraft>
                {
                    new("Lesson A1", "Outcome", 0),
                    new("Lesson A2", null, 1),
                }),
                new("Module B", null, 1, new List<CourseGenerationLessonDraft>
                {
                    new("Lesson B1", "Outcome B", 0),
                }),
            },
            MatchedSkills: matched ?? new List<CourseGenerationSkillMatch>
            {
                new(1, "Communication", "Soft"),
                new(999, "Ghost Skill", null),
            });

    private static async Task<(ApplicationDbContext Context, AppUser Recruiter, Company Company, Skill Skill)> CreateRecruiterAsync()
    {
        var context = TestDbContextFactory.Create();
        var company = new Company { Name = "Acme Corp" };
        context.Companies.Add(company);
        var skill = new Skill { Name = "Communication", Category = "Soft" };
        context.Skills.Add(skill);
        var recruiter = new AppUser { FirstName = "Recruiter", LastName = "User", EmailAddress = $"recruiter-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Recruiter" };
        context.Users.Add(recruiter);
        await context.SaveChangesAsync();
        recruiter.CompanyId = company.CompanyId;
        await context.SaveChangesAsync();
        return (context, recruiter, company, skill);
    }

    private static CourseGenerationAgent CreateAgent(ApplicationDbContext context, FakeGoogleAiService ai)
        => new(context, ai, new AppUserRepository(context), new SkillRepository(context), NullLogger<CourseGenerationAgent>.Instance);

    [Fact]
    public async Task GenerateAsync_ReturnsDraft_AndGroundsSkills()
    {
        var (context, recruiter, _, _) = await CreateRecruiterAsync();
        var ai = new FakeGoogleAiService { CourseResult = SampleDraft() };
        var agent = CreateAgent(context, ai);
        var request = new CourseGenerationRequest(Brief: "Support onboarding for Cebu team", TechnicalLevel: 2, Mode: "Online", ModuleCount: 2, LessonsPerModule: 2);

        var envelope = await agent.GenerateAsync(recruiter.UserId, request);

        Assert.NotNull(envelope.Draft);
        Assert.Equal("AI-Generated Customer Support", envelope.Draft.Name);
        Assert.Equal(2, envelope.Draft.Modules.Count);
        Assert.Equal(1, ai.GenerateCalls);
        Assert.Equal("Support onboarding for Cebu team", ai.LastContext!.Brief);
    }

    [Fact]
    public async Task GenerateAsync_WhenAiReturnsNull_ThrowsInvalidOperation()
    {
        var (context, recruiter, _, _) = await CreateRecruiterAsync();
        var ai = new FakeGoogleAiService { CourseResult = null };
        var agent = CreateAgent(context, ai);
        var request = new CourseGenerationRequest(Brief: "Anything");

        await Assert.ThrowsAsync<InvalidOperationException>(() => agent.GenerateAsync(recruiter.UserId, request));
    }

    [Fact]
    public async Task GenerateAsync_ForNonRecruiter_ThrowsUnauthorized()
    {
        var context = TestDbContextFactory.Create();
        var learner = new AppUser { FirstName = "Learner", LastName = "User", EmailAddress = $"learner-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Learner" };
        context.Users.Add(learner);
        await context.SaveChangesAsync();
        var ai = new FakeGoogleAiService { CourseResult = SampleDraft() };
        var agent = CreateAgent(context, ai);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => agent.GenerateAsync(learner.UserId, new CourseGenerationRequest(Brief: "Hello")));
    }

    [Fact]
    public async Task GenerateAsync_ForRecruiterWithoutCompany_ThrowsUnauthorized()
    {
        var context = TestDbContextFactory.Create();
        var recruiter = new AppUser { FirstName = "Recruiter", LastName = "User", EmailAddress = $"recruiter-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Recruiter", CompanyId = null };
        context.Users.Add(recruiter);
        await context.SaveChangesAsync();
        var ai = new FakeGoogleAiService { CourseResult = SampleDraft() };
        var agent = CreateAgent(context, ai);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => agent.GenerateAsync(recruiter.UserId, new CourseGenerationRequest(Brief: "Hello")));
    }

    [Fact]
    public async Task GenerateAsync_EmptyBrief_ThrowsArgumentException()
    {
        var (context, recruiter, _, _) = await CreateRecruiterAsync();
        var ai = new FakeGoogleAiService { CourseResult = SampleDraft() };
        var agent = CreateAgent(context, ai);

        await Assert.ThrowsAsync<ArgumentException>(() => agent.GenerateAsync(recruiter.UserId, new CourseGenerationRequest(Brief: "   ")));
    }

    [Fact]
    public async Task CommitAsync_PersistsCourse_Modules_Lessons_AndSkills()
    {
        var (context, recruiter, company, skill) = await CreateRecruiterAsync();
        var draft = SampleDraft(new List<CourseGenerationSkillMatch> { new(skill.SkillId, skill.Name, skill.Category) });
        var ai = new FakeGoogleAiService { CourseResult = draft };
        var agent = CreateAgent(context, ai);
        var commit = new CommitCourseGenerationRequest(Draft: draft, GenreId: null, Price: 199);

        var result = await agent.CommitAsync(recruiter.UserId, commit);

        Assert.NotNull(result);
        Assert.Equal("AI-Generated Customer Support", result!.Name);
        Assert.Equal("Draft", result.Status);
        var course = context.Courses.First(c => c.CourseId == result.CourseId);
        Assert.Equal(company.CompanyId, course.CompanyId);
        Assert.Equal(2, context.CourseModules.Count(m => m.CourseId == course.CourseId));
        Assert.Equal(3, context.Lessons.Count(l => l.CourseId == course.CourseId));
        Assert.Single(context.CourseSkills.Where(cs => cs.CourseId == course.CourseId));
        Assert.Equal(skill.SkillId, context.CourseSkills.First(cs => cs.CourseId == course.CourseId).SkillId);
    }

    [Fact]
    public async Task CommitAsync_IgnoresUnknownSkillIds()
    {
        var (context, recruiter, _, _) = await CreateRecruiterAsync();
        var draft = SampleDraft(new List<CourseGenerationSkillMatch> { new(9999, "Ghost", null) });
        var agent = CreateAgent(context, new FakeGoogleAiService { CourseResult = draft });

        var result = await agent.CommitAsync(recruiter.UserId, new CommitCourseGenerationRequest(Draft: draft, GenreId: null, Price: null));

        Assert.NotNull(result);
        Assert.Empty(context.CourseSkills.Where(cs => cs.CourseId == result!.CourseId));
    }

    [Fact]
    public async Task CommitAsync_ForNonRecruiter_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var learner = new AppUser { FirstName = "Learner", LastName = "User", EmailAddress = $"learner-{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Learner" };
        context.Users.Add(learner);
        await context.SaveChangesAsync();
        var draft = SampleDraft();
        var agent = CreateAgent(context, new FakeGoogleAiService { CourseResult = draft });

        var result = await agent.CommitAsync(learner.UserId, new CommitCourseGenerationRequest(Draft: draft, GenreId: null, Price: null));

        Assert.Null(result);
        Assert.Empty(context.Courses);
    }

    [Fact]
    public async Task CommitAsync_WithEmptyDraft_ReturnsNull()
    {
        var (context, recruiter, _, _) = await CreateRecruiterAsync();
        var emptyDraft = new CourseGenerationResult(Name: "", Description: null, TechnicalLevel: 1, Mode: "Online", Rationale: null, Modules: new List<CourseGenerationModuleDraft>(), MatchedSkills: new List<CourseGenerationSkillMatch>());
        var agent = CreateAgent(context, new FakeGoogleAiService { CourseResult = emptyDraft });

        var result = await agent.CommitAsync(recruiter.UserId, new CommitCourseGenerationRequest(Draft: emptyDraft, GenreId: null, Price: null));

        Assert.Null(result);
        Assert.Empty(context.Courses);
    }

    [Fact]
    public async Task CommitAsync_WithNullDraft_ReturnsNull()
    {
        var (context, recruiter, _, _) = await CreateRecruiterAsync();
        var agent = CreateAgent(context, new FakeGoogleAiService());

        var result = await agent.CommitAsync(recruiter.UserId, new CommitCourseGenerationRequest(Draft: null!, GenreId: null, Price: null));

        Assert.Null(result);
    }
}
