using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class SkillGapServiceTests
{
    private static SkillGapService CreateService(ApplicationDbContext context) => new(
        new AppUserRepository(context),
        new RoleSkillRepository(context),
        new LearnerRepository(context),
        new LearnerSkillRepository(context),
        NullLogger<SkillGapService>.Instance
    );

    private static async Task<(AppUser User, Learner? Learner)> CreateLearnerAsync(
        ApplicationDbContext context,
        string? targetRole = "Frontend Developer")
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
        await context.SaveChangesAsync();

        if (targetRole == null) return (user, null);

        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        context.Learners.Add(learner);
        await context.SaveChangesAsync();
        return (user, learner);
    }

    [Fact]
    public async Task GetSkillGapsAsync_WhenUserHasNoTargetRole_ReturnsEmpty()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context, targetRole: null);

        var result = await CreateService(context).GetSkillGapsAsync(user.UserId);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSkillGapsAsync_WhenUserNotFound_ReturnsEmpty()
    {
        var context = TestDbContextFactory.Create();

        var result = await CreateService(context).GetSkillGapsAsync(999);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSkillGapsAsync_ComputesGapsOrderedByGapDescThenName()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);

        var css = new Skill { Name = "CSS", Category = "Frontend" };
        var html = new Skill { Name = "HTML", Category = "Frontend" };
        var js = new Skill { Name = "JavaScript", Category = "Frontend" };
        context.Skills.AddRange(css, html, js);
        await context.SaveChangesAsync();

        context.RoleSkills.AddRange(
            new RoleSkill { TargetRole = user.TargetRole!, SkillId = js.SkillId, RequiredLevel = 4 },
            new RoleSkill { TargetRole = user.TargetRole!, SkillId = css.SkillId, RequiredLevel = 3 },
            new RoleSkill { TargetRole = user.TargetRole!, SkillId = html.SkillId, RequiredLevel = 2 }
        );
        await context.SaveChangesAsync();

        context.LearnerSkills.Add(new LearnerSkill
        {
            LearnerId = learner!.LearnerId,
            SkillId = js.SkillId,
            CurrentLevel = 1,
            Verified = false,
        });
        context.LearnerSkills.Add(new LearnerSkill
        {
            LearnerId = learner!.LearnerId,
            SkillId = html.SkillId,
            CurrentLevel = 2,
            Verified = true,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetSkillGapsAsync(user.UserId);

        Assert.Equal(3, result.Count);

        Assert.Equal("CSS", result[0].SkillName);
        Assert.Equal(3, result[0].RequiredLevel);
        Assert.Equal(0, result[0].CurrentLevel);
        Assert.Equal(3, result[0].Gap);
        Assert.False(result[0].Verified);

        Assert.Equal("JavaScript", result[1].SkillName);
        Assert.Equal(4, result[1].RequiredLevel);
        Assert.Equal(1, result[1].CurrentLevel);
        Assert.Equal(3, result[1].Gap);
        Assert.False(result[1].Verified);

        Assert.Equal("HTML", result[2].SkillName);
        Assert.Equal(2, result[2].RequiredLevel);
        Assert.Equal(2, result[2].CurrentLevel);
        Assert.Equal(0, result[2].Gap);
        Assert.True(result[2].Verified);
    }

    [Fact]
    public async Task GetSkillGapsAsync_WhenLearnerExceedsRequiredLevel_GapIsZero()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);

        var skill = new Skill { Name = "React", Category = "Frontend" };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();

        context.RoleSkills.Add(new RoleSkill { TargetRole = user.TargetRole!, SkillId = skill.SkillId, RequiredLevel = 2 });
        context.LearnerSkills.Add(new LearnerSkill
        {
            LearnerId = learner!.LearnerId,
            SkillId = skill.SkillId,
            CurrentLevel = 5,
            Verified = true,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetSkillGapsAsync(user.UserId);

        var gap = Assert.Single(result);
        Assert.Equal(0, gap.Gap);
        Assert.Equal(5, gap.CurrentLevel);
        Assert.True(gap.Verified);
    }

    [Fact]
    public async Task GetSkillGapsAsync_WhenNoLearnerProfile_ReportsFullGap()
    {
        var context = TestDbContextFactory.Create();
        var user = new AppUser
        {
            FirstName = "No",
            LastName = "Learner",
            EmailAddress = $"user-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Learner",
            TargetRole = "Backend Developer",
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var skill = new Skill { Name = "C#", Category = "Backend" };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();

        context.RoleSkills.Add(new RoleSkill { TargetRole = user.TargetRole!, SkillId = skill.SkillId, RequiredLevel = 4 });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetSkillGapsAsync(user.UserId);

        var gap = Assert.Single(result);
        Assert.Equal(4, gap.RequiredLevel);
        Assert.Equal(0, gap.CurrentLevel);
        Assert.Equal(4, gap.Gap);
        Assert.False(gap.Verified);
    }
}
