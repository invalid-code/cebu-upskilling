using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class LearningPathwayAgentTests
{
    private const string TargetRole = "Frontend Developer";

    private static LearningPathwayAgent CreateAgent(ApplicationDbContext context) => new(
        context,
        new AppUserRepository(context),
        new LearnerRepository(context),
        new RoleSkillRepository(context),
        new LearnerSkillRepository(context),
        new ApplicationRepository(context),
        new CourseRepository(context),
        new LearnerStudyCourseRepository(context),
        NullLogger<LearningPathwayAgent>.Instance
    );

    private static async Task<(AppUser User, Learner Learner)> CreateLearnerAsync(
        ApplicationDbContext context, string? targetRole = TargetRole)
    {
        var user = new AppUser
        {
            FirstName = "Jose",
            LastName = "Rizal",
            EmailAddress = $"learner-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Learner",
            TargetRole = targetRole,
        };
        context.Users.Add(user);
        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);
        await context.SaveChangesAsync();
        return (user, learner);
    }

    private static async Task<Genre> CreateGenreAsync(ApplicationDbContext context)
    {
        var discipline = new Discipline { Name = "Technology" };
        context.Disciplines.Add(discipline);
        await context.SaveChangesAsync();

        var sub = new SubDiscipline { DisciplineId = discipline.DomainId, Name = "General" };
        context.SubDisciplines.Add(sub);
        await context.SaveChangesAsync();

        var genre = new Genre { SubDisciplineId = sub.SubDisciplineId, Name = "General" };
        context.Genres.Add(genre);
        await context.SaveChangesAsync();
        return genre;
    }

    private static async Task<Skill> CreateSkillAsync(ApplicationDbContext context, string name)
    {
        var skill = new Skill { Name = name };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();
        return skill;
    }

    private static async Task<Course> CreateCourseAsync(
        ApplicationDbContext context, string name, Genre genre, params int[] skillIds)
    {
        var course = new Course { GenreId = genre.GenreId, Name = name, Price = 0, TechnicalLevel = 3 };
        context.Courses.Add(course);
        await context.SaveChangesAsync();

        foreach (var skillId in skillIds)
            context.CourseSkills.Add(new CourseSkill { CourseId = course.CourseId, SkillId = skillId });
        await context.SaveChangesAsync();
        return course;
    }

    [Fact]
    public async Task GenerateAsync_OrdersStepsByGapTimesDemand()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var hot = await CreateSkillAsync(context, "Hot Skill");
        var cold = await CreateSkillAsync(context, "Cold Skill");

        // Hot: gap 2, demand 5 -> score 12. Cold: gap 4, demand 0 -> score 4.
        context.RoleSkills.AddRange(
            new RoleSkill { TargetRole = TargetRole, SkillId = hot.SkillId, RequiredLevel = 3 },
            new RoleSkill { TargetRole = TargetRole, SkillId = cold.SkillId, RequiredLevel = 4 });
        context.LearnerSkills.AddRange(
            new LearnerSkill { LearnerId = learner.LearnerId, SkillId = hot.SkillId, CurrentLevel = 1 },
            new LearnerSkill { LearnerId = learner.LearnerId, SkillId = cold.SkillId, CurrentLevel = 0 });
        context.SkillMarketTrends.Add(new SkillMarketTrend
        {
            SkillId = hot.SkillId, ActivePostings = 5, TotalPostings = 6, AvgRequiredLevel = 3, UpdatedAt = DateTime.UtcNow,
        });
        context.RoleMarketTrends.Add(new RoleMarketTrend
        {
            TargetRole = TargetRole, ActivePostings = 7, TotalPostings = 9, UpdatedAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var pathway = await CreateAgent(context).GenerateAsync(user.UserId);

        Assert.NotNull(pathway);
        Assert.Equal(TargetRole, pathway.TargetRole);
        Assert.Equal(7, pathway.RoleActivePostings);
        Assert.Equal(2, pathway.TotalGaps);
        Assert.Equal("Hot Skill", pathway.Steps[0].SkillName);
        Assert.Equal(12, pathway.Steps[0].PriorityScore);
        Assert.Equal(5, pathway.Steps[0].ActivePostings);
        Assert.Equal("Cold Skill", pathway.Steps[1].SkillName);
        Assert.Equal(1, pathway.Steps[0].StepNumber);
        Assert.Equal(2, pathway.Steps[1].StepNumber);
        // required 3+4=7, current 1+0=1 -> 14%
        Assert.Equal(14, pathway.MatchPercent);
    }

    [Fact]
    public async Task GenerateAsync_RecommendsCourses_ExcludesCompleted_FlagsEnrolled()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var genre = await CreateGenreAsync(context);
        var skill = await CreateSkillAsync(context, "Welding");

        context.RoleSkills.Add(new RoleSkill { TargetRole = TargetRole, SkillId = skill.SkillId, RequiredLevel = 4 });
        context.LearnerSkills.Add(new LearnerSkill { LearnerId = learner.LearnerId, SkillId = skill.SkillId, CurrentLevel = 1 });
        await context.SaveChangesAsync();

        var fresh = await CreateCourseAsync(context, "Fresh Welding Course", genre, skill.SkillId);
        var ongoing = await CreateCourseAsync(context, "Ongoing Welding Course", genre, skill.SkillId);
        var done = await CreateCourseAsync(context, "Done Welding Course", genre, skill.SkillId);
        context.LearnerStudyCourses.AddRange(
            new LearnerStudyCourse { LearnerId = learner.LearnerId, CourseId = ongoing.CourseId, LastTotalProgressPercent = 40 },
            new LearnerStudyCourse { LearnerId = learner.LearnerId, CourseId = done.CourseId, LastTotalProgressPercent = 100 });
        await context.SaveChangesAsync();

        var pathway = await CreateAgent(context).GenerateAsync(user.UserId);

        var step = Assert.Single(pathway!.Steps);
        Assert.Equal(2, step.RecommendedCourses.Count);
        Assert.DoesNotContain(step.RecommendedCourses, c => c.CourseId == done.CourseId);
        Assert.Equal("Fresh Welding Course", step.RecommendedCourses[0].Name);
        Assert.False(step.RecommendedCourses[0].IsEnrolled);
        Assert.True(step.RecommendedCourses[1].IsEnrolled);
        Assert.Equal(40, step.RecommendedCourses[1].ProgressPercent);
        Assert.Equal("Enroll in Fresh Welding Course", step.SuggestedAction);
    }

    [Fact]
    public async Task GenerateAsync_GapWithNoCourse_SuggestsAssessment()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var skill = await CreateSkillAsync(context, "Untaught Skill");

        context.RoleSkills.Add(new RoleSkill { TargetRole = TargetRole, SkillId = skill.SkillId, RequiredLevel = 3 });
        await context.SaveChangesAsync();

        var pathway = await CreateAgent(context).GenerateAsync(user.UserId);

        var step = Assert.Single(pathway!.Steps);
        Assert.Empty(step.RecommendedCourses);
        Assert.Contains("No course covers Untaught Skill yet", step.SuggestedAction);
    }

    [Fact]
    public async Task GenerateAsync_WithoutLearner_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();

        Assert.Null(await CreateAgent(context).GenerateAsync(999));
    }

    [Fact]
    public async Task GenerateAsync_WithoutTargetRole_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context, targetRole: null);

        Assert.Null(await CreateAgent(context).GenerateAsync(user.UserId));
    }

    [Fact]
    public async Task GenerateAsync_NoGaps_ReturnsEmptySteps_FullMatch()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var skill = await CreateSkillAsync(context, "Mastered Skill");

        context.RoleSkills.Add(new RoleSkill { TargetRole = TargetRole, SkillId = skill.SkillId, RequiredLevel = 3 });
        context.LearnerSkills.Add(new LearnerSkill { LearnerId = learner.LearnerId, SkillId = skill.SkillId, CurrentLevel = 4 });
        await context.SaveChangesAsync();

        var pathway = await CreateAgent(context).GenerateAsync(user.UserId);

        Assert.NotNull(pathway);
        Assert.Empty(pathway.Steps);
        Assert.Equal(0, pathway.TotalGaps);
        Assert.Equal(100, pathway.MatchPercent);
    }
}
