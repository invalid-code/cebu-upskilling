using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class JobMarketTrendTests
{
    private static (PostService Posts, JobMarketTrendService Trends) Create(ApplicationDbContext ctx)
    {
        var trends = new JobMarketTrendService(ctx, NullLogger<JobMarketTrendService>.Instance);
        var posts = new PostService(
            new PostRepository(ctx),
            new PostSkillRepository(ctx),
            new RoleSkillRepository(ctx),
            new SkillRepository(ctx),
            NullLogger<PostService>.Instance,
            trends);
        return (posts, trends);
    }

    private static async Task<Company> CreateCompanyAsync(ApplicationDbContext ctx, string name = "Acme Corp")
    {
        var company = new Company { Name = name };
        ctx.Companies.Add(company);
        await ctx.SaveChangesAsync();
        return company;
    }

    private static async Task<Skill> CreateSkillAsync(ApplicationDbContext ctx, string name)
    {
        var skill = new Skill { Name = name };
        ctx.Skills.Add(skill);
        await ctx.SaveChangesAsync();
        return skill;
    }

    private static PostRequest Req(string targetRole, List<RequiredSkillInput>? skills = null, bool isActive = true) =>
        new("Title", "Description", targetRole, null, null, "Full-time", null, null, null,
            IsActive: isActive, RequiredSkills: skills);

    [Fact]
    public async Task CreateAsync_UpdatesSkillAndRoleTrends()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var skill = await CreateSkillAsync(ctx, "Welding");
        var (posts, _) = Create(ctx);

        await posts.CreateAsync(
            Req("Welder", [new RequiredSkillInput(skill.SkillId, 3)]),
            company.CompanyId);

        var skillTrend = await ctx.SkillMarketTrends.SingleAsync();
        Assert.Equal(skill.SkillId, skillTrend.SkillId);
        Assert.Equal(1, skillTrend.ActivePostings);
        Assert.Equal(1, skillTrend.TotalPostings);
        Assert.Equal(3, skillTrend.AvgRequiredLevel);

        var roleTrend = await ctx.RoleMarketTrends.SingleAsync();
        Assert.Equal("Welder", roleTrend.TargetRole);
        Assert.Equal(1, roleTrend.ActivePostings);
        Assert.Equal(1, roleTrend.TotalPostings);
    }

    [Fact]
    public async Task CreateAsync_SecondPostForSameSkill_AggregatesCountsAndAverage()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var skill = await CreateSkillAsync(ctx, "Welding");
        var (posts, _) = Create(ctx);

        await posts.CreateAsync(Req("Welder", [new RequiredSkillInput(skill.SkillId, 2)]), company.CompanyId);
        await posts.CreateAsync(Req("Welder", [new RequiredSkillInput(skill.SkillId, 4)]), company.CompanyId);

        var skillTrend = await ctx.SkillMarketTrends.SingleAsync();
        Assert.Equal(2, skillTrend.ActivePostings);
        Assert.Equal(2, skillTrend.TotalPostings);
        Assert.Equal(3, skillTrend.AvgRequiredLevel);

        var roleTrend = await ctx.RoleMarketTrends.SingleAsync();
        Assert.Equal(2, roleTrend.ActivePostings);
    }

    [Fact]
    public async Task CreateAsync_InactivePost_CountsTowardTotalOnly()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var skill = await CreateSkillAsync(ctx, "Welding");
        var (posts, _) = Create(ctx);

        await posts.CreateAsync(
            Req("Welder", [new RequiredSkillInput(skill.SkillId, 3)], isActive: false),
            company.CompanyId);

        var skillTrend = await ctx.SkillMarketTrends.SingleAsync();
        Assert.Equal(0, skillTrend.ActivePostings);
        Assert.Equal(1, skillTrend.TotalPostings);

        var roleTrend = await ctx.RoleMarketTrends.SingleAsync();
        Assert.Equal(0, roleTrend.ActivePostings);
        Assert.Equal(1, roleTrend.TotalPostings);
    }

    [Fact]
    public async Task UpdateAsync_ChangingSkillsAndRole_RefreshesOldAndNewTrends()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var welding = await CreateSkillAsync(ctx, "Welding");
        var scaffolding = await CreateSkillAsync(ctx, "Scaffolding");
        var (posts, _) = Create(ctx);

        var created = await posts.CreateAsync(
            Req("Welder", [new RequiredSkillInput(welding.SkillId, 3)]),
            company.CompanyId);

        await posts.UpdateAsync(
            created.PostId,
            Req("Scaffolder", [new RequiredSkillInput(scaffolding.SkillId, 4)]));

        // Old skill/role rows are pruned; new ones reflect the update.
        Assert.Equal([scaffolding.SkillId], await ctx.SkillMarketTrends.Select(t => t.SkillId).ToListAsync());
        Assert.Equal(["Scaffolder"], await ctx.RoleMarketTrends.Select(t => t.TargetRole).ToListAsync());

        var skillTrend = await ctx.SkillMarketTrends.SingleAsync();
        Assert.Equal(4, skillTrend.AvgRequiredLevel);
    }

    [Fact]
    public async Task DeleteAsync_PruneTrendRowsWithNoRemainingPosts()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var skill = await CreateSkillAsync(ctx, "Welding");
        var (posts, _) = Create(ctx);

        var first = await posts.CreateAsync(
            Req("Welder", [new RequiredSkillInput(skill.SkillId, 2)]), company.CompanyId);
        await posts.CreateAsync(
            Req("Welder", [new RequiredSkillInput(skill.SkillId, 4)]), company.CompanyId);

        Assert.True(await posts.DeleteAsync(first.PostId));

        var skillTrend = await ctx.SkillMarketTrends.SingleAsync();
        Assert.Equal(1, skillTrend.ActivePostings);
        Assert.Equal(4, skillTrend.AvgRequiredLevel);

        var remaining = await ctx.Posts.Select(p => p.PostId).ToListAsync();
        Assert.True(await posts.DeleteAsync(remaining.Single()));

        Assert.Empty(await ctx.SkillMarketTrends.ToListAsync());
        Assert.Empty(await ctx.RoleMarketTrends.ToListAsync());
    }

    [Fact]
    public async Task GetTrendsAsync_ReturnsMostDemandedFirst_AndRespectsTop()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var popular = await CreateSkillAsync(ctx, "Popular");
        var niche = await CreateSkillAsync(ctx, "Niche");
        var (posts, trends) = Create(ctx);

        await posts.CreateAsync(Req("Role A", [new RequiredSkillInput(popular.SkillId, 3)]), company.CompanyId);
        await posts.CreateAsync(Req("Role A", [new RequiredSkillInput(popular.SkillId, 3)]), company.CompanyId);
        await posts.CreateAsync(Req("Role B", [new RequiredSkillInput(niche.SkillId, 3)]), company.CompanyId);

        var all = await trends.GetTrendsAsync(50);
        Assert.Equal(2, all.Skills.Count);
        Assert.Equal("Popular", all.Skills[0].SkillName);
        Assert.Equal("Niche", all.Skills[1].SkillName);
        Assert.Equal(2, all.Roles.Count);
        Assert.Equal("Role A", all.Roles[0].TargetRole);

        var topOne = await trends.GetTrendsAsync(1);
        Assert.Single(topOne.Skills);
        Assert.Single(topOne.Roles);
    }

    [Fact]
    public async Task RefreshAllAsync_BackfillsTrends()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var skill = await CreateSkillAsync(ctx, "Welding");

        // Seed posts without the trend hook (no trend service on this instance).
        var plain = new PostService(
            new PostRepository(ctx),
            new PostSkillRepository(ctx),
            new RoleSkillRepository(ctx),
            new SkillRepository(ctx),
            NullLogger<PostService>.Instance);
        await plain.CreateAsync(
            Req("Welder", [new RequiredSkillInput(skill.SkillId, 3)]), company.CompanyId);
        Assert.Empty(await ctx.SkillMarketTrends.ToListAsync());

        var (_, trends) = Create(ctx);
        await trends.RefreshAllAsync();

        Assert.Equal(1, await ctx.SkillMarketTrends.CountAsync());
        Assert.Equal(1, await ctx.RoleMarketTrends.CountAsync());
    }
}
