using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Recommendations must be driven by CourseSkills coverage of the learner's
/// skill gaps (tags persisted at generation/commit time), with the legacy
/// name-substring matching kept only as a fallback for untagged courses.
/// </summary>
public class CourseRecommendationTests
{
    private const string TargetRole = "Frontend Developer";

    private static CoursesPageService CreateService(ApplicationDbContext context) => new(
        new AppUserRepository(context),
        new LearnerRepository(context),
        new CourseRepository(context),
        new LearnerStudyCourseRepository(context),
        new RoleSkillRepository(context),
        new LearnerSkillRepository(context),
        new ApplicationRepository(context),
        NullLogger<CoursesPageService>.Instance
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
            TargetRole = TargetRole,
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

    private static async Task<Skill> CreateSkillAsync(ApplicationDbContext context, string name, string? category = null)
    {
        var skill = new Skill { Name = name, Category = category };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();
        return skill;
    }

    private static async Task<Course> CreateCourseAsync(
        ApplicationDbContext context,
        string name,
        Genre genre,
        params int[] skillIds)
    {
        var course = new Course { GenreId = genre.GenreId, Name = name, Price = 0, TechnicalLevel = 3 };
        context.Courses.Add(course);
        await context.SaveChangesAsync();

        foreach (var skillId in skillIds)
            context.CourseSkills.Add(new CourseSkill { CourseId = course.CourseId, SkillId = skillId });
        await context.SaveChangesAsync();
        return course;
    }

    /// <summary>
    /// TypeScript: required 4, current 1 (gap). CSS: required 3, current 3 (no gap).
    /// Git: required 2, unassessed (gap).
    /// </summary>
    private static async Task SetupGapsAsync(ApplicationDbContext context, Learner learner,
        Skill typescript, Skill css, Skill git)
    {
        context.RoleSkills.AddRange(
            new RoleSkill { TargetRole = TargetRole, SkillId = typescript.SkillId, RequiredLevel = 4 },
            new RoleSkill { TargetRole = TargetRole, SkillId = css.SkillId, RequiredLevel = 3 },
            new RoleSkill { TargetRole = TargetRole, SkillId = git.SkillId, RequiredLevel = 2 });
        context.LearnerSkills.AddRange(
            new LearnerSkill { LearnerId = learner.LearnerId, SkillId = typescript.SkillId, CurrentLevel = 1 },
            new LearnerSkill { LearnerId = learner.LearnerId, SkillId = css.SkillId, CurrentLevel = 3 });
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task TaggedCourse_CoveringGaps_IsRecommended_WithCoverageReason()
    {
        var context = TestDbContextFactory.Create();
        var (_, learner) = await CreateLearnerAsync(context);
        var genre = await CreateGenreAsync(context);
        var typescript = await CreateSkillAsync(context, "TypeScript", "Language");
        var css = await CreateSkillAsync(context, "CSS", "Language");
        var git = await CreateSkillAsync(context, "Git", "Tool");
        await SetupGapsAsync(context, learner, typescript, css, git);

        // Neutral name: no skill substring, so only the CourseSkills tags can match.
        await CreateCourseAsync(context, "Patterns Masterclass", genre, typescript.SkillId, git.SkillId);

        var page = await CreateService(context).GetCoursesPageAsync(learner.UserId);

        var course = Assert.Single(page!.RecommendedCourses);
        Assert.True(course.IsRecommended);
        Assert.Contains("Covers 2 skill gaps", course.RecommendedReason);
        Assert.Contains("TypeScript", course.RecommendedReason);
        Assert.Contains("Git", course.RecommendedReason);
        Assert.DoesNotContain("CSS", course.RecommendedReason);
        Assert.Equal("Language", course.SkillCategory);
    }

    [Fact]
    public async Task TaggedCourse_CoveringNoGaps_IsNotRecommended()
    {
        var context = TestDbContextFactory.Create();
        var (_, learner) = await CreateLearnerAsync(context);
        var genre = await CreateGenreAsync(context);
        var typescript = await CreateSkillAsync(context, "TypeScript", "Language");
        var css = await CreateSkillAsync(context, "CSS", "Language");
        var git = await CreateSkillAsync(context, "Git", "Tool");
        await SetupGapsAsync(context, learner, typescript, css, git);

        // Tagged only with CSS, which has no gap; neutral name avoids fallbacks.
        await CreateCourseAsync(context, "Styling Foundations", genre, css.SkillId);

        var page = await CreateService(context).GetCoursesPageAsync(learner.UserId);

        var course = Assert.Single(page!.RecommendedCourses);
        Assert.False(course.IsRecommended);
        Assert.Null(course.RecommendedReason);
    }

    [Fact]
    public async Task UntaggedCourse_WithNameMatch_KeepsLegacyRecommendation()
    {
        var context = TestDbContextFactory.Create();
        var (_, learner) = await CreateLearnerAsync(context);
        var genre = await CreateGenreAsync(context);
        var typescript = await CreateSkillAsync(context, "TypeScript", "Language");
        var css = await CreateSkillAsync(context, "CSS", "Language");
        var git = await CreateSkillAsync(context, "Git", "Tool");
        await SetupGapsAsync(context, learner, typescript, css, git);

        // No tags, but the name matches a role-required skill: legacy fallback.
        await CreateCourseAsync(context, "CSS in Practice", genre);

        var page = await CreateService(context).GetCoursesPageAsync(learner.UserId);

        var course = Assert.Single(page!.RecommendedCourses);
        Assert.True(course.IsRecommended);
        Assert.Equal("Recommended for CSS", course.RecommendedReason);
    }

    [Fact]
    public async Task Courses_OrderByGapCoverageDescending()
    {
        var context = TestDbContextFactory.Create();
        var (_, learner) = await CreateLearnerAsync(context);
        var genre = await CreateGenreAsync(context);
        var typescript = await CreateSkillAsync(context, "TypeScript", "Language");
        var css = await CreateSkillAsync(context, "CSS", "Language");
        var git = await CreateSkillAsync(context, "Git", "Tool");
        await SetupGapsAsync(context, learner, typescript, css, git);

        await CreateCourseAsync(context, "Single Focus Session", genre, git.SkillId);
        await CreateCourseAsync(context, "Broad Mastery Program", genre, typescript.SkillId, git.SkillId);
        await CreateCourseAsync(context, "Cooking Basics", genre);

        var page = await CreateService(context).GetCoursesPageAsync(learner.UserId);

        Assert.Equal(3, page!.RecommendedCourses.Count);
        Assert.Equal("Broad Mastery Program", page.RecommendedCourses[0].Name);
        Assert.Equal("Single Focus Session", page.RecommendedCourses[1].Name);
        Assert.Equal("Cooking Basics", page.RecommendedCourses[2].Name);
        Assert.False(page.RecommendedCourses[2].IsRecommended);
    }
}
