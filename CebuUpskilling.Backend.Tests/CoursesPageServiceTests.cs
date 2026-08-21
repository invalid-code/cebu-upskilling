using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class CoursesPageServiceTests
{
    private static CoursesPageService CreateService(ApplicationDbContext context) => new(
        new AppUserRepository(context),
        new LearnerRepository(context),
        new CourseRepository(context),
        new LearnerStudyCourseRepository(context),
        new RoleSkillRepository(context),
        new LearnerSkillRepository(context),
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
            TargetRole = "Frontend Developer",
        };
        context.Users.Add(user);

        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);
        await context.SaveChangesAsync();
        return (user, learner);
    }

    private static async Task<Genre> CreateGenreAsync(ApplicationDbContext context, string name, string subDiscipline)
    {
        var discipline = new Discipline { Name = "Technology" };
        context.Disciplines.Add(discipline);
        await context.SaveChangesAsync();

        var sub = new SubDiscipline { DisciplineId = discipline.DomainId, Name = subDiscipline };
        context.SubDisciplines.Add(sub);
        await context.SaveChangesAsync();

        var genre = new Genre { SubDisciplineId = sub.SubDisciplineId, Name = name };
        context.Genres.Add(genre);
        await context.SaveChangesAsync();
        return genre;
    }

    private static async Task<(AppUser User, Learner Learner)> CreateLearnerNoRoleAsync(ApplicationDbContext context)
    {
        var user = new AppUser
        {
            FirstName = "Jose",
            LastName = "Rizal",
            EmailAddress = $"learner-norole-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Learner",
            TargetRole = null,
        };
        context.Users.Add(user);

        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);
        await context.SaveChangesAsync();
        return (user, learner);
    }

    private static async Task<Course> CreateCourseAsync(
        ApplicationDbContext context,
        string name,
        Genre genre,
        int lessonCount = 0)
    {
        var course = new Course
        {
            GenreId = genre.GenreId,
            Name = name,
            Price = 0,
            TechnicalLevel = 3,
        };
        context.Courses.Add(course);
        await context.SaveChangesAsync();

        for (var i = 0; i < lessonCount; i++)
        {
            var module = new CourseModule { CourseId = course.CourseId, Name = $"Module {i + 1}", Order = i + 1 };
            context.CourseModules.Add(module);
            await context.SaveChangesAsync();

            context.Lessons.Add(new Lesson { ModuleId = module.ModuleId, CourseId = course.CourseId, Name = $"Lesson {i + 1}" });
        }
        await context.SaveChangesAsync();
        return course;
    }

    [Fact]
    public async Task GetCoursesPageAsync_WhenNoLearnerProfile_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();

        var result = await CreateService(context).GetCoursesPageAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetCoursesPageAsync_ReturnsEnrolledCoursesWithProgressAndStreak()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var genre = await CreateGenreAsync(context, "Frontend", "Frontend");
        var course = await CreateCourseAsync(context, "Intro to Frontend", genre, lessonCount: 2);

        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = course.CourseId,
            Started = DateTime.UtcNow.AddDays(-2),
            LastTotalProgressPercent = 50,
            LastOnline = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetCoursesPageAsync(user.UserId);

        Assert.NotNull(result);
        Assert.Single(result!.EnrolledCourses);
        Assert.Equal(50, result.EnrolledCourses[0].ProgressPercent);
        Assert.Equal("Module 1", result.EnrolledCourses[0].CurrentModule);
        Assert.Equal(2, result.EnrolledCourses[0].TotalModules);
        Assert.Equal(3, result.EnrolledCourses[0].TechnicalLevel);
        Assert.Equal(1, result.CoursesInProgress);
        Assert.Equal(0, result.CertificatesEarned);
        Assert.Equal(7, result.DayStreak);
    }

    [Fact]
    public async Task GetCoursesPageAsync_CountsCompletedCoursesAsCertificatesEarned()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var genre = await CreateGenreAsync(context, "Frontend", "Frontend");
        var course = await CreateCourseAsync(context, "Finished Course", genre, lessonCount: 1);

        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = course.CourseId,
            Started = DateTime.UtcNow.AddDays(-2),
            LastTotalProgressPercent = 100,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetCoursesPageAsync(user.UserId);

        Assert.NotNull(result);
        Assert.Equal(0, result!.CoursesInProgress);
        Assert.Equal(1, result.CertificatesEarned);
    }

    [Fact]
    public async Task GetCoursesPageAsync_ExcludesEnrolledCoursesFromRecommended()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var genre = await CreateGenreAsync(context, "Frontend", "Frontend");
        var enrolledCourse = await CreateCourseAsync(context, "Enrolled Course", genre, lessonCount: 1);
        var freeCourse = await CreateCourseAsync(context, "Free Course", genre, lessonCount: 1);

        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = enrolledCourse.CourseId,
            Started = DateTime.UtcNow,
            LastTotalProgressPercent = 10,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetCoursesPageAsync(user.UserId);

        Assert.NotNull(result);
        var recommended = Assert.Single(result!.RecommendedCourses);
        Assert.Equal(freeCourse.CourseId, recommended.CourseId);
        Assert.True(recommended.IsRecommended);
        Assert.Equal("Recommended", recommended.RecommendedReason);
        Assert.False(recommended.IsEnrolled);
        Assert.True(recommended.IsFree);
        Assert.Equal("Frontend", recommended.Category);
    }

    [Fact]
    public async Task GetCoursesPageAsync_WithUnverifiedParsedSkill_RecommendsMatchingCourse()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerNoRoleAsync(context);
        var genre = await CreateGenreAsync(context, "React", "Frontend");
        var course = await CreateCourseAsync(context, "React Basics", genre, lessonCount: 1);

        context.Skills.Add(new Skill { Name = "React", Category = "Framework" });
        await context.SaveChangesAsync();

        var reactSkill = await context.Skills.SingleAsync<Entities.Skill>(s => s.Name == "React");
        context.LearnerSkills.Add(new LearnerSkill
        {
            LearnerId = learner.LearnerId,
            SkillId = reactSkill.SkillId,
            CurrentLevel = 0,
            Verified = false,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetCoursesPageAsync(user.UserId);

        Assert.NotNull(result);
        var recommended = Assert.Single(result!.RecommendedCourses);
        Assert.Equal(course.CourseId, recommended.CourseId);
        Assert.True(recommended.IsRecommended);
        Assert.Equal("Matches React", recommended.RecommendedReason);
    }

    [Fact]
    public async Task GetCoursesPageAsync_WithoutMatchingSkillsOrRole_DoesNotRecommend()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerNoRoleAsync(context);
        var genre = await CreateGenreAsync(context, "Backend", "Backend");
        var course = await CreateCourseAsync(context, "C# Fundamentals", genre, lessonCount: 1);

        context.Skills.Add(new Skill { Name = "React", Category = "Framework" });
        await context.SaveChangesAsync();

        var reactSkill = await context.Skills.SingleAsync<Entities.Skill>(s => s.Name == "React");
        context.LearnerSkills.Add(new LearnerSkill
        {
            LearnerId = learner.LearnerId,
            SkillId = reactSkill.SkillId,
            CurrentLevel = 0,
            Verified = true,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetCoursesPageAsync(user.UserId);

        Assert.NotNull(result);
        var recommended = Assert.Single(result!.RecommendedCourses);
        Assert.Equal(course.CourseId, recommended.CourseId);
        Assert.False(recommended.IsRecommended);
        Assert.Null(recommended.RecommendedReason);
    }

    [Fact]
    public async Task GetCoursesPageAsync_FiltersRecommendedByCategory()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);
        var frontendGenre = await CreateGenreAsync(context, "Frontend", "Frontend");
        var backendGenre = await CreateGenreAsync(context, "Backend", "Backend");
        var frontendCourse = await CreateCourseAsync(context, "React Basics", frontendGenre, lessonCount: 1);
        var backendCourse = await CreateCourseAsync(context, "C# Fundamentals", backendGenre, lessonCount: 1);

        var service = CreateService(context);

        var frontendPage = await service.GetCoursesPageAsync(user.UserId, category: "Frontend");
        Assert.NotNull(frontendPage);
        var frontendRecommended = Assert.Single(frontendPage!.RecommendedCourses);
        Assert.Equal(frontendCourse.CourseId, frontendRecommended.CourseId);

        var allPage = await service.GetCoursesPageAsync(user.UserId, category: "All");
        Assert.NotNull(allPage);
        Assert.Equal(2, allPage!.RecommendedCourses.Count);
        Assert.Contains(allPage.RecommendedCourses, c => c.CourseId == frontendCourse.CourseId);
        Assert.Contains(allPage.RecommendedCourses, c => c.CourseId == backendCourse.CourseId);
    }

    [Fact]
    public async Task GetCourseDetailAsync_WhenNoLearnerProfileOrCourse_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();

        Assert.Null(await CreateService(context).GetCourseDetailAsync(999, 1));

        var (user, _) = await CreateLearnerAsync(context);
        Assert.Null(await CreateService(context).GetCourseDetailAsync(user.UserId, 999));
    }

    [Fact]
    public async Task GetCourseDetailAsync_ReturnsDetailWithModulesAndCompletion()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);
        var genre = await CreateGenreAsync(context, "Frontend", "Frontend");
        var course = await CreateCourseAsync(context, "React Basics", genre, lessonCount: 2);

        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = course.CourseId,
            Started = DateTime.UtcNow,
            LastTotalProgressPercent = 50,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetCourseDetailAsync(user.UserId, course.CourseId);

        Assert.NotNull(result);
        Assert.True(result!.IsEnrolled);
        Assert.Equal(50, result.ProgressPercent);
        Assert.Equal(2, result.TotalModules);
        Assert.Equal(1, result.CompletedModules);
        Assert.Equal(2, result.Modules.Count);
        Assert.Equal(1, result.Modules[0].ModuleNumber);
        Assert.Equal(2, result.Modules[1].ModuleNumber);
        Assert.Equal(1, result.Modules[0].LessonCount);
        Assert.Equal("Frontend", result.Category);
    }

    [Fact]
    public async Task GetCourseDetailAsync_WhenNotEnrolled_ReportsZeroProgress()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context);
        var genre = await CreateGenreAsync(context, "Frontend", "Frontend");
        var course = await CreateCourseAsync(context, "React Basics", genre, lessonCount: 1);

        var result = await CreateService(context).GetCourseDetailAsync(user.UserId, course.CourseId);

        Assert.NotNull(result);
        Assert.False(result!.IsEnrolled);
        Assert.Equal(0, result.ProgressPercent);
        Assert.Equal(0, result.CompletedModules);
    }
}
