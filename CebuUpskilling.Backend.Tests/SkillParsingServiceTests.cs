using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class SkillParsingServiceTests
{
    private class FakeGoogleAiService : IGoogleAiService
    {
        private readonly List<string> _skills;
        public FakeGoogleAiService(List<string> skills) => _skills = skills;

        public Task<List<string>> ParseSkillsFromResumeAsync(string resumeText, CancellationToken ct = default)
            => Task.FromResult(_skills);

        public Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(
            string skillName, int count = 5, CancellationToken ct = default)
            => Task.FromResult(new List<GeneratedAssessmentQuestion>());
    }

    private static SkillParsingService CreateService(ApplicationDbContext context, List<string> aiSkills) => new(
        new FakeGoogleAiService(aiSkills),
        new SkillRepository(context),
        new LearnerRepository(context),
        new LearnerSkillRepository(context),
        new LearnerAssessmentRepository(context),
        NullLogger<SkillParsingService>.Instance
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

    [Fact]
    public async Task ParseAndCreateAssessmentsAsync_WhenNoSkillsParsed_ReturnsEmptyResult()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);

        var result = await CreateService(context, new List<string>()).ParseAndCreateAssessmentsAsync(user.UserId, "resume");

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

        var result = await CreateService(context, new List<string> { "JavaScript", "React" })
            .ParseAndCreateAssessmentsAsync(user.UserId, "resume");

        Assert.Equal(2, result.Skills.Count);
        Assert.All(result.Skills, s => Assert.NotNull(s.AssessmentId));

        Assert.Equal(2, context.Skills.Count());
        Assert.Equal(2, context.LearnerSkills.Count(ls => ls.LearnerId == learner.LearnerId));
        Assert.Equal(2, context.LearnerAssessments.Count(a => a.LearnerId == learner.LearnerId));
        Assert.All(context.LearnerAssessments.Where(a => a.LearnerId == learner.LearnerId),
            a => Assert.Equal(0, a.ScoredLevel));
    }

    [Fact]
    public async Task ParseAndCreateAssessmentsAsync_ReusesExistingSkills_WithoutDuplicating()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);

        var existing = new Skill { Name = "JavaScript", Category = "Language" };
        context.Skills.Add(existing);
        await context.SaveChangesAsync();

        var result = await CreateService(context, new List<string> { "JavaScript" })
            .ParseAndCreateAssessmentsAsync(user.UserId, "resume");

        var parsed = Assert.Single(result.Skills);
        Assert.Equal(existing.SkillId, parsed.SkillId);
        Assert.Single(context.Skills);
    }

    [Fact]
    public async Task ParseAndCreateAssessmentsAsync_NormalizesAndDeduplicatesNames()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);

        var result = await CreateService(context, new List<string> { "javascript", "JavaScript", "  React  " })
            .ParseAndCreateAssessmentsAsync(user.UserId, "resume");

        Assert.Equal(2, result.Skills.Count);
        Assert.Contains(result.Skills, s => s.SkillName == "javascript");
        Assert.Contains(result.Skills, s => s.SkillName == "React");
        Assert.Equal(2, context.Skills.Count());
    }

    [Fact]
    public async Task ParseAndCreateAssessmentsAsync_IgnoresEmptyAndOverlongNames()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);

        var tooLong = new string('A', 101);
        var result = await CreateService(context, new List<string> { "", "   ", tooLong })
            .ParseAndCreateAssessmentsAsync(user.UserId, "resume");

        Assert.Empty(result.Skills);
        Assert.Empty(context.Skills);
    }

    [Fact]
    public async Task ParseAndCreateAssessmentsAsync_WhenNoLearnerProfile_ReturnsResultsWithoutAssessmentIds()
    {
        var context = TestDbContextFactory.Create();
        var user = new AppUser
        {
            FirstName = "No",
            LastName = "Learner",
            EmailAddress = $"user-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Learner",
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var result = await CreateService(context, new List<string> { "Python" })
            .ParseAndCreateAssessmentsAsync(user.UserId, "resume");

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

        context.LearnerAssessments.Add(new LearnerAssessment
        {
            LearnerId = learner.LearnerId,
            SkillId = skill.SkillId,
            ScoredLevel = 4,
            Verified = true,
            CompletedAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context, new List<string> { "Python" })
            .ParseAndCreateAssessmentsAsync(user.UserId, "resume");

        var parsed = Assert.Single(result.Skills);
        Assert.Null(parsed.AssessmentId);
        Assert.Equal(1, context.LearnerAssessments.Count(a => a.LearnerId == learner.LearnerId));
    }
}
