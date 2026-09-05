using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Tests for the employer-side <see cref="EmployerHiringAgent"/> covering
/// candidate ranking (AI + deterministic fallback), job-post drafting, and
/// company screening question generation.
/// </summary>
public class EmployerHiringAgentTests
{
    private class FakeGoogleAiService : IGoogleAiService
    {
        public List<CandidateRanking>? Rankings { get; set; }
        public DraftJobPostResponse? Draft { get; set; }
        public List<GeneratedAssessmentQuestion> Questions { get; set; } = new();
        public int QuestionCalls { get; private set; }

        public Task<List<string>> ParseSkillsFromResumeAsync(string resumeText, CancellationToken ct = default)
            => Task.FromResult(new List<string>());

        public Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(string skillName, int count = 5, CancellationToken ct = default)
        {
            QuestionCalls++;
            return Task.FromResult(Questions);
        }

        public Task<List<CandidateRanking>> RankCandidatesAsync(string jobTitle, string targetRole, string? requirements, List<CandidateSkillProfile> candidates, CancellationToken ct = default)
            => Task.FromResult(Rankings ?? new List<CandidateRanking>());

        public Task<DraftJobPostResponse?> DraftJobPostAsync(DraftJobPostRequest request, CancellationToken ct = default)
            => Task.FromResult(Draft);

        public Task<CourseGenerationResult?> GenerateCourseOutlineAsync(CourseGenerationPromptContext context, CancellationToken ct = default) => Task.FromResult<CourseGenerationResult?>(null);
    }

    private static EmployerHiringAgent CreateAgent(ApplicationDbContext context, FakeGoogleAiService ai) => new(
        ai,
        new ApplicationRepository(context),
        new PostRepository(context),
        new RoleSkillRepository(context),
        new AssessmentQuestionRepository(context),
        new PostService(
            new PostRepository(context),
            new PostSkillRepository(context),
            new RoleSkillRepository(context),
            new SkillRepository(context),
            NullLogger<PostService>.Instance),
        NullLogger<EmployerHiringAgent>.Instance);

    private static async Task<(Company Company, AppUser Recruiter)> CreateRecruiterAsync(ApplicationDbContext context)
    {
        var company = new Company { Name = "Cebu Tech" };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var recruiter = new AppUser
        {
            FirstName = "Recruiter",
            LastName = "One",
            EmailAddress = $"recruiter-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Recruiter",
            CompanyId = company.CompanyId,
        };
        context.Users.Add(recruiter);
        await context.SaveChangesAsync();
        return (company, recruiter);
    }

    private static async Task<(AppUser User, Learner Learner)> CreateLearnerAsync(ApplicationDbContext context, string first, string last)
    {
        var user = new AppUser
        {
            FirstName = first,
            LastName = last,
            EmailAddress = $"{first}-{Guid.NewGuid():N}@example.com".ToLowerInvariant(),
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

    private static async Task<Post> CreatePostAsync(ApplicationDbContext context, Company company, string targetRole = "Frontend Developer")
    {
        var post = new Post
        {
            CompanyId = company.CompanyId,
            Title = $"{targetRole} (Cebu)",
            TargetRole = targetRole,
            Description = "Build web apps.",
            CreatedAt = DateTime.UtcNow,
        };
        context.Posts.Add(post);
        await context.SaveChangesAsync();
        return post;
    }

    // -----------------------------------------------------------------
    // Ranking
    // -----------------------------------------------------------------

    [Fact]
    public async Task RankApplicantsAsync_NoApplicants_ReturnsEmpty()
    {
        var context = TestDbContextFactory.Create();
        var (_, recruiter) = await CreateRecruiterAsync(context);
        var company = await context.Companies.SingleAsync(c => c.CompanyId == recruiter.CompanyId!.Value);
        var post = await CreatePostAsync(context, company);
        var agent = CreateAgent(context, new FakeGoogleAiService());

        var result = await agent.RankApplicantsAsync(recruiter.UserId, post.PostId, company.CompanyId);

        Assert.False(result.AiRanked);
        Assert.Empty(result.Candidates);
    }

    [Fact]
    public async Task RankApplicantsAsync_PostNotFound_ReturnsEmpty()
    {
        var context = TestDbContextFactory.Create();
        var (_, recruiter) = await CreateRecruiterAsync(context);
        var agent = CreateAgent(context, new FakeGoogleAiService());

        var result = await agent.RankApplicantsAsync(recruiter.UserId, postId: 9999, companyId: 1);

        Assert.False(result.AiRanked);
        Assert.Empty(result.Candidates);
    }

    [Fact]
    public async Task RankApplicantsAsync_WithAiRankings_OrdersByScoreAndUsesRationale()
    {
        var context = TestDbContextFactory.Create();
        var (company, recruiter) = await CreateRecruiterAsync(context);
        var post = await CreatePostAsync(context, company);

        var (_, learnerA) = await CreateLearnerAsync(context, "Ana", "Tan");
        var (_, learnerB) = await CreateLearnerAsync(context, "Ben", "Cruz");
        context.Applications.AddRange(
            new Application { LearnerId = learnerA.LearnerId, PostId = post.PostId, Status = "applied", AppliedAt = DateTime.UtcNow.AddHours(-2) },
            new Application { LearnerId = learnerB.LearnerId, PostId = post.PostId, Status = "applied", AppliedAt = DateTime.UtcNow.AddHours(-1) });
        await context.SaveChangesAsync();
        var appIds = context.Applications.Select(a => a.ApplicationId).OrderBy(id => id).ToList();

        var ai = new FakeGoogleAiService
        {
            Rankings = new List<CandidateRanking>
            {
                new(appIds[0], 92, "Strong React depth."),
                new(appIds[1], 55, "Some gaps in TypeScript."),
            },
        };
        var agent = CreateAgent(context, ai);

        var result = await agent.RankApplicantsAsync(recruiter.UserId, post.PostId, company.CompanyId);

        Assert.True(result.AiRanked);
        Assert.Equal(2, result.Candidates.Count);
        Assert.Equal(appIds[0], result.Candidates[0].ApplicationId);
        Assert.Equal(92, result.Candidates[0].Score);
        Assert.Contains("React depth", result.Candidates[0].Rationale);
        Assert.Equal("Ana Tan", result.Candidates[0].LearnerName);
    }

    [Fact]
    public async Task RankApplicantsAsync_AiUnavailable_FallsBackToDeterministicScores()
    {
        var context = TestDbContextFactory.Create();
        var (company, recruiter) = await CreateRecruiterAsync(context);
        var post = await CreatePostAsync(context, company);

        var skill = new Skill { Name = "React", Category = "Framework" };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();

        var (_, learner) = await CreateLearnerAsync(context, "Ana", "Tan");
        context.LearnerSkills.Add(new LearnerSkill { LearnerId = learner.LearnerId, SkillId = skill.SkillId, CurrentLevel = 4, Verified = true });
        context.Applications.Add(new Application { LearnerId = learner.LearnerId, PostId = post.PostId, Status = "applied", AppliedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var agent = CreateAgent(context, new FakeGoogleAiService());

        var result = await agent.RankApplicantsAsync(recruiter.UserId, post.PostId, company.CompanyId);

        Assert.False(result.AiRanked);
        var candidate = Assert.Single(result.Candidates);
        // (4 level + 1 verified bonus) / (1 * 6) * 100 = 83.3
        Assert.Equal(83.3, candidate.Score);
        Assert.Contains("unavailable", candidate.Rationale);
        Assert.Contains("React", candidate.Skills);
    }

    // -----------------------------------------------------------------
    // Job post drafting
    // -----------------------------------------------------------------

    [Fact]
    public async Task DraftJobPostAsync_IncompleteRequest_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (_, recruiter) = await CreateRecruiterAsync(context);
        var agent = CreateAgent(context, new FakeGoogleAiService { Draft = new DraftJobPostResponse("d", "r", "b", new List<string>()) });

        var result = await agent.DraftJobPostAsync(recruiter.UserId, new DraftJobPostRequest("", "", null, null, null, null));

        Assert.Null(result);
    }

    [Fact]
    public async Task DraftJobPostAsync_ReturnsAiDraft()
    {
        var context = TestDbContextFactory.Create();
        var (_, recruiter) = await CreateRecruiterAsync(context);
        var draft = new DraftJobPostResponse("Great role.", "- React\n- TS", "- HMO", new List<string> { "React", "TypeScript" });
        var agent = CreateAgent(context, new FakeGoogleAiService { Draft = draft });

        var result = await agent.DraftJobPostAsync(
            recruiter.UserId, new DraftJobPostRequest("Frontend Dev", "Frontend Developer", null, null, null, null));

        Assert.NotNull(result);
        Assert.Equal("Great role.", result!.Description);
        Assert.Equal(2, result.SuggestedSkills.Count);
    }

    // -----------------------------------------------------------------
    // Screening questions
    // -----------------------------------------------------------------

    [Fact]
    public async Task GenerateScreeningQuestionsAsync_CreatesCompanyQuestionsForRoleSkills()
    {
        var context = TestDbContextFactory.Create();
        var (company, recruiter) = await CreateRecruiterAsync(context);
        var post = await CreatePostAsync(context, company);

        var skill = new Skill { Name = "JavaScript", Category = "Language" };
        context.Skills.Add(skill);
        context.RoleSkills.Add(new RoleSkill { TargetRole = post.TargetRole, SkillId = skill.SkillId, RequiredLevel = 3 });
        await context.SaveChangesAsync();

        var questions = new List<GeneratedAssessmentQuestion>
        {
            new("What is a closure?", "fn+scope", "loop", "class", "event", 0),
            new("Which is falsy?", "0", "quote-zero", "empty-array", "object", 0),
        };
        var ai = new FakeGoogleAiService { Questions = questions };
        var agent = CreateAgent(context, ai);

        var result = await agent.GenerateScreeningQuestionsAsync(recruiter.UserId, post.PostId, company.CompanyId);

        Assert.Equal(2, result.Questions.Count);
        Assert.All(result.Questions, q =>
        {
            Assert.Equal("Company", q.Source);
            Assert.Equal("Cebu Tech", q.CompanyName);
        });
        Assert.Equal(2, context.AssessmentQuestions.Count());
        Assert.All(context.AssessmentQuestions, q => Assert.Equal(AssessmentSource.Company, q.Source));
    }

    [Fact]
    public async Task GenerateScreeningQuestionsAsync_NoRoleSkills_ReturnsEmptyWithoutCallingAi()
    {
        var context = TestDbContextFactory.Create();
        var (company, recruiter) = await CreateRecruiterAsync(context);
        var post = await CreatePostAsync(context, company);
        var ai = new FakeGoogleAiService { Questions = new List<GeneratedAssessmentQuestion> { new("Q", "a", "b", "c", "d", 0) } };
        var agent = CreateAgent(context, ai);

        var result = await agent.GenerateScreeningQuestionsAsync(recruiter.UserId, post.PostId, company.CompanyId);

        Assert.Empty(result.Questions);
        Assert.Equal(0, ai.QuestionCalls);
    }

    [Fact]
    public async Task RankApplicantsAsync_PostOwnedByOtherCompany_ReturnsEmptyWithoutCallingAi()
    {
        var context = TestDbContextFactory.Create();
        var (companyA, recruiterA) = await CreateRecruiterAsync(context);
        var companyB = new Company { Name = "Other Corp" };
        context.Companies.Add(companyB);
        await context.SaveChangesAsync();
        var post = await CreatePostAsync(context, companyB);

        var ai = new FakeGoogleAiService();
        var agent = CreateAgent(context, ai);

        var result = await agent.RankApplicantsAsync(recruiterA.UserId, post.PostId, companyA.CompanyId);

        Assert.False(result.AiRanked);
        Assert.Empty(result.Candidates);
    }

    [Fact]
    public async Task GenerateScreeningQuestionsAsync_PostOwnedByOtherCompany_CreatesNothing()
    {
        var context = TestDbContextFactory.Create();
        var (companyA, recruiterA) = await CreateRecruiterAsync(context);
        var companyB = new Company { Name = "Rival Corp" };
        context.Companies.Add(companyB);
        await context.SaveChangesAsync();
        var post = await CreatePostAsync(context, companyB);

        var skill = new Skill { Name = "JavaScript", Category = "Language" };
        context.Skills.Add(skill);
        context.RoleSkills.Add(new RoleSkill { TargetRole = post.TargetRole, SkillId = skill.SkillId, RequiredLevel = 3 });
        await context.SaveChangesAsync();

        var ai = new FakeGoogleAiService { Questions = new List<GeneratedAssessmentQuestion> { new("Q", "a", "b", "c", "d", 0) } };
        var agent = CreateAgent(context, ai);

        var result = await agent.GenerateScreeningQuestionsAsync(recruiterA.UserId, post.PostId, companyA.CompanyId);

        Assert.Empty(result.Questions);
        Assert.Equal(0, ai.QuestionCalls);
        Assert.Empty(context.AssessmentQuestions);
    }

    private static async Task<(Skill Js, Skill React)> SeedRoleSkillsAsync(ApplicationDbContext context, string targetRole = "Frontend Developer")
    {
        var js = new Skill { Name = "JavaScript", Category = "Language" };
        var react = new Skill { Name = "React", Category = "Framework" };
        context.Skills.AddRange(js, react);
        await context.SaveChangesAsync();
        context.RoleSkills.AddRange(
            new RoleSkill { TargetRole = targetRole, SkillId = js.SkillId, RequiredLevel = 4 },
            new RoleSkill { TargetRole = targetRole, SkillId = react.SkillId, RequiredLevel = 3 });
        await context.SaveChangesAsync();
        return (js, react);
    }

    [Fact]
    public async Task CreateJobPostFromTargetRoleAsync_BlankTargetRole_ReturnsNullWithoutCreating()
    {
        var context = TestDbContextFactory.Create();
        var (company, recruiter) = await CreateRecruiterAsync(context);
        var agent = CreateAgent(context, new FakeGoogleAiService());

        var result = await agent.CreateJobPostFromTargetRoleAsync(
            recruiter.UserId, company.CompanyId, new CreateJobPostFromRoleRequest(null, "  ", null, null, null, null));

        Assert.Null(result);
        Assert.Empty(context.Posts);
    }

    [Fact]
    public async Task CreateJobPostFromTargetRoleAsync_NullRequest_ReturnsNullWithoutCreating()
    {
        var context = TestDbContextFactory.Create();
        var (company, recruiter) = await CreateRecruiterAsync(context);
        var agent = CreateAgent(context, new FakeGoogleAiService());

        var result = await agent.CreateJobPostFromTargetRoleAsync(recruiter.UserId, company.CompanyId, null);

        Assert.Null(result);
        Assert.Empty(context.Posts);
    }

    [Fact]
    public async Task CreateJobPostFromTargetRoleAsync_UnknownRole_ReturnsNullWithoutCreating()
    {
        var context = TestDbContextFactory.Create();
        var (company, recruiter) = await CreateRecruiterAsync(context);
        await SeedRoleSkillsAsync(context, "Frontend Developer");
        var agent = CreateAgent(context, new FakeGoogleAiService());

        var result = await agent.CreateJobPostFromTargetRoleAsync(
            recruiter.UserId, company.CompanyId, new CreateJobPostFromRoleRequest(null, "Cobol Wrangler", null, null, null, null));

        Assert.Null(result);
        Assert.Empty(context.Posts);
    }

    [Fact]
    public async Task CreateJobPostFromTargetRoleAsync_WithAiDraft_CreatesPostWithRoleSkills()
    {
        var context = TestDbContextFactory.Create();
        var (company, recruiter) = await CreateRecruiterAsync(context);
        var (js, react) = await SeedRoleSkillsAsync(context);
        var ai = new FakeGoogleAiService
        {
            Draft = new DraftJobPostResponse("AI description", "AI requirements", "AI benefits", new List<string> { "JavaScript" })
        };
        var agent = CreateAgent(context, ai);

        var result = await agent.CreateJobPostFromTargetRoleAsync(
            recruiter.UserId, company.CompanyId,
            new CreateJobPostFromRoleRequest(null, "Frontend Developer", "Cebu City", "Full-time", "Mid", "$1000", false));

        Assert.NotNull(result);
        Assert.True(result.AiDrafted);
        Assert.Equal("Frontend Developer", result.Post.Title);
        Assert.Equal("Frontend Developer", result.Post.TargetRole);
        Assert.Equal(company.CompanyId, result.Post.CompanyId);
        Assert.Equal("AI description", result.Post.Description);
        Assert.Equal("AI requirements", result.Post.Requirements);
        Assert.Equal("AI benefits", result.Post.Benefits);
        var levels = result.Post.RequiredSkills.ToDictionary(s => s.SkillId, s => s.RequiredLevel);
        Assert.Equal(4, levels[js.SkillId]);
        Assert.Equal(3, levels[react.SkillId]);
        Assert.Equal(2, context.PostSkills.Count());
    }

    [Fact]
    public async Task CreateJobPostFromTargetRoleAsync_WithoutAiDraft_UsesTemplateAndStillCreates()
    {
        var context = TestDbContextFactory.Create();
        var (company, recruiter) = await CreateRecruiterAsync(context);
        await SeedRoleSkillsAsync(context);
        var agent = CreateAgent(context, new FakeGoogleAiService { Draft = null });

        var result = await agent.CreateJobPostFromTargetRoleAsync(
            recruiter.UserId, company.CompanyId,
            new CreateJobPostFromRoleRequest("Junior Frontend Dev", "Frontend Developer", null, null, null, null));

        Assert.NotNull(result);
        Assert.False(result.AiDrafted);
        Assert.Equal("Junior Frontend Dev", result.Post.Title);
        Assert.Equal("Frontend Developer", result.Post.TargetRole);
        Assert.Contains("Frontend Developer", result.Post.Description);
        Assert.Contains("JavaScript", result.Post.Requirements);
        Assert.Contains("React", result.Post.Requirements);
        Assert.Equal(2, result.Post.RequiredSkills.Count);
    }

    [Fact]
    public async Task CreateJobPostFromTargetRoleAsync_MatchesTargetRoleCaseInsensitively()
    {
        var context = TestDbContextFactory.Create();
        var (company, recruiter) = await CreateRecruiterAsync(context);
        await SeedRoleSkillsAsync(context, "Frontend Developer");
        var agent = CreateAgent(context, new FakeGoogleAiService { Draft = null });

        var result = await agent.CreateJobPostFromTargetRoleAsync(
            recruiter.UserId, company.CompanyId,
            new CreateJobPostFromRoleRequest(null, "frontend developer", null, null, null, null));

        Assert.NotNull(result);
        Assert.Equal("frontend developer", result.Post.TargetRole);
        Assert.Equal(2, result.Post.RequiredSkills.Count);
    }
}
