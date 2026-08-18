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
        new ApplicationRepository(context),
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

        var group = Assert.Single(result);
        Assert.Equal("Frontend Developer", group.Role);
        Assert.Equal(3, group.Gaps.Count);

        Assert.Equal("CSS", group.Gaps[0].SkillName);
        Assert.Equal(3, group.Gaps[0].RequiredLevel);
        Assert.Equal(0, group.Gaps[0].CurrentLevel);
        Assert.Equal(3, group.Gaps[0].Gap);
        Assert.False(group.Gaps[0].Verified);

        Assert.Equal("JavaScript", group.Gaps[1].SkillName);
        Assert.Equal(4, group.Gaps[1].RequiredLevel);
        Assert.Equal(1, group.Gaps[1].CurrentLevel);
        Assert.Equal(3, group.Gaps[1].Gap);
        Assert.False(group.Gaps[1].Verified);

        Assert.Equal("HTML", group.Gaps[2].SkillName);
        Assert.Equal(2, group.Gaps[2].RequiredLevel);
        Assert.Equal(2, group.Gaps[2].CurrentLevel);
        Assert.Equal(0, group.Gaps[2].Gap);
        Assert.True(group.Gaps[2].Verified);
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

        var group = Assert.Single(result);
        var gap = Assert.Single(group.Gaps);
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

        var group = Assert.Single(result);
        var gap = Assert.Single(group.Gaps);
        Assert.Equal(4, gap.RequiredLevel);
        Assert.Equal(0, gap.CurrentLevel);
        Assert.Equal(4, gap.Gap);
        Assert.False(gap.Verified);
    }

    [Fact]
    public async Task GetSkillGapGroupsAsync_WhenNoTargetRoleOrApplications_ReturnsEmpty()
    {
        var context = TestDbContextFactory.Create();
        var (user, _) = await CreateLearnerAsync(context, targetRole: null);

        var result = await CreateService(context).GetSkillGapGroupsAsync(user.UserId);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSkillGapGroupsAsync_FallsBackToProfileTargetRole_WhenNoRoleLinkedApplications()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);

        var skill = new Skill { Name = "JavaScript", Category = "Frontend" };
        context.Skills.Add(skill);
        await context.SaveChangesAsync();

        context.RoleSkills.Add(new RoleSkill { TargetRole = user.TargetRole!, SkillId = skill.SkillId, RequiredLevel = 4 });
        context.LearnerSkills.Add(new LearnerSkill
        {
            LearnerId = learner!.LearnerId,
            SkillId = skill.SkillId,
            CurrentLevel = 2,
            Verified = true,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetSkillGapGroupsAsync(user.UserId);

        var group = Assert.Single(result);
        Assert.Equal(user.TargetRole, group.Role);
        Assert.Null(group.CompanyName);
        Assert.Null(group.PostId);
        Assert.Equal(50, group.MatchPercent);
        var gap = Assert.Single(group.Gaps);
        Assert.Equal(2, gap.Gap);
        Assert.True(gap.Verified);
    }

    [Fact]
    public async Task GetSkillGapGroupsAsync_DerivesGroupsFromAppliedJobsTargetRoles()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);

        var frontend = new Skill { Name = "JavaScript", Category = "Frontend" };
        var backend = new Skill { Name = "C#", Category = "Backend" };
        context.Skills.AddRange(frontend, backend);
        await context.SaveChangesAsync();

        context.RoleSkills.AddRange(
            new RoleSkill { TargetRole = "Frontend Developer", SkillId = frontend.SkillId, RequiredLevel = 4 },
            new RoleSkill { TargetRole = "Backend Developer", SkillId = backend.SkillId, RequiredLevel = 3 }
        );
        context.LearnerSkills.Add(new LearnerSkill
        {
            LearnerId = learner!.LearnerId,
            SkillId = frontend.SkillId,
            CurrentLevel = 2,
            Verified = true,
        });
        await context.SaveChangesAsync();

        var company = new Company { Name = "Serbisyo Digital" };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var recruiter = new Recruiter { CompanyId = company.CompanyId, UserId = user.UserId };
        context.Recruiters.Add(recruiter);
        await context.SaveChangesAsync();

        var frontendPost = new Post
        {
            RecruiterId = recruiter.RecruiterId,
            CompanyId = company.CompanyId,
            Title = "Frontend Developer (React)",
            TargetRole = "Frontend Developer",
        };
        var backendPost = new Post
        {
            RecruiterId = recruiter.RecruiterId,
            CompanyId = company.CompanyId,
            Title = "Backend Developer (C#)",
            TargetRole = "Backend Developer",
        };
        context.Posts.AddRange(frontendPost, backendPost);
        await context.SaveChangesAsync();

        context.Applications.AddRange(
            new Application { LearnerId = learner.LearnerId, PostId = frontendPost.PostId, Status = "applied", AppliedAt = DateTime.UtcNow.AddDays(-1) },
            new Application { LearnerId = learner.LearnerId, PostId = backendPost.PostId, Status = "applied", AppliedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetSkillGapGroupsAsync(user.UserId);

        Assert.Equal(2, result.Count);

        var feRole = Assert.Single(result.Where(g => g.Role == "Frontend Developer"));
        Assert.Equal("Serbisyo Digital", feRole.CompanyName);
        Assert.Equal(frontendPost.PostId, feRole.PostId);
        Assert.Equal(50, feRole.MatchPercent);

        var beRole = Assert.Single(result.Where(g => g.Role == "Backend Developer"));
        Assert.Equal("Serbisyo Digital", beRole.CompanyName);
        Assert.Equal(backendPost.PostId, beRole.PostId);
        Assert.Equal(0, beRole.MatchPercent);
        Assert.Equal(3, Assert.Single(beRole.Gaps).Gap);
    }

    [Fact]
    public async Task GetSkillGapsAsync_WhenApplicationHasRole_PrefersItOverProfileRole()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner) = await CreateLearnerAsync(context);

        var frontendSkill = new Skill { Name = "JavaScript", Category = "Frontend" };
        var backendSkill = new Skill { Name = "C#", Category = "Backend" };
        context.Skills.AddRange(frontendSkill, backendSkill);
        await context.SaveChangesAsync();

        context.RoleSkills.AddRange(
            new RoleSkill { TargetRole = "Frontend Developer", SkillId = frontendSkill.SkillId, RequiredLevel = 4 },
            new RoleSkill { TargetRole = "Backend Developer", SkillId = backendSkill.SkillId, RequiredLevel = 3 }
        );
        await context.SaveChangesAsync();

        var company = new Company { Name = "Acme" };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var recruiter = new Recruiter { CompanyId = company.CompanyId, UserId = user.UserId };
        context.Recruiters.Add(recruiter);
        await context.SaveChangesAsync();

        var post = new Post
        {
            RecruiterId = recruiter.RecruiterId,
            CompanyId = company.CompanyId,
            Title = "Backend Developer",
            TargetRole = "Backend Developer",
        };
        context.Posts.Add(post);
        await context.SaveChangesAsync();

        context.Applications.Add(new Application
        {
            LearnerId = learner!.LearnerId,
            PostId = post.PostId,
            Status = "applied",
            AppliedAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetSkillGapsAsync(user.UserId);

        var group = Assert.Single(result);
        Assert.Equal("Backend Developer", group.Role);
        var gap = Assert.Single(group.Gaps);
        Assert.Equal("C#", gap.SkillName);
        Assert.Equal("Frontend Developer", user.TargetRole);
    }
}
