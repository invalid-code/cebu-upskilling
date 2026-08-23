using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Regression coverage for PostService which previously reported 0% line-rate.
/// Exercises branch logic for Title/TargetRole fallback, JobType default,
/// paging clamps, company name fallback and CRUD via InMemory DB.
/// </summary>
public class PostServiceRegressionTests
{
    private static PostService Create(ApplicationDbContext ctx) =>
        new(new PostRepository(ctx), NullLogger<PostService>.Instance);

    private static async Task<Company> CreateCompanyAsync(ApplicationDbContext ctx, string name = "Acme Corp")
    {
        var c = new Company { Name = name };
        ctx.Companies.Add(c);
        await ctx.SaveChangesAsync();
        return c;
    }

    private static PostRequest Req(string? title = null, string? description = null, string? targetRole = null, string? jobType = null) =>
        new(title, description, targetRole, null, null, jobType, null, null, null);

    [Fact]
    public async Task CreateAsync_WithNullTitle_FallsBackToEmpty_TargetRoleBecomesEmpty()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var svc = Create(ctx);

        var req = Req(title: null, description: "desc", targetRole: null, jobType: null);
        var res = await svc.CreateAsync(req, company.CompanyId);

        Assert.Equal(string.Empty, res.Title);
        Assert.Equal(string.Empty, res.TargetRole);
        Assert.Equal("Full-time", res.JobType);
        Assert.Equal(company.CompanyId, res.CompanyId);
        Assert.Equal("Acme Corp", res.CompanyName);
    }

    [Fact]
    public async Task CreateAsync_WithExplicitTargetRole_UsesIt()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var svc = Create(ctx);

        var req = Req(title: "My Title", targetRole: "Backend Developer");
        var res = await svc.CreateAsync(req, company.CompanyId);

        Assert.Equal("Backend Developer", res.TargetRole);
    }

    [Fact]
    public async Task CreateAsync_WithBlankTargetRole_FallsBackToTitle()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var svc = Create(ctx);

        var req = Req(title: "Fallback Title", targetRole: "   ");
        var res = await svc.CreateAsync(req, company.CompanyId);

        Assert.Equal("Fallback Title", res.TargetRole);
    }

    [Fact]
    public async Task CreateAsync_WithBlankJobType_DefaultsToFullTime()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var svc = Create(ctx);

        var req = Req(title: "T", jobType: "   ");
        var res = await svc.CreateAsync(req, company.CompanyId);
        Assert.Equal("Full-time", res.JobType);
    }

    [Fact]
    public async Task CreateAsync_WithExplicitJobType_PreservesIt()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var svc = Create(ctx);

        var req = Req(title: "T", jobType: "Part-time");
        var res = await svc.CreateAsync(req, company.CompanyId);
        Assert.Equal("Part-time", res.JobType);
    }

    [Fact]
    public async Task GetByIdAsync_WhenMissing_ReturnsNull()
    {
        var ctx = TestDbContextFactory.Create();
        var svc = Create(ctx);
        Assert.Null(await svc.GetByIdAsync(999));
    }

    [Fact]
    public async Task GetByIdAsync_WhenExists_ReturnsMappedResponse_WithCompanyNameFallback()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var svc = Create(ctx);
        var req = Req(title: "Hello", targetRole: "Engineer");
        var created = await svc.CreateAsync(req, company.CompanyId);

        var fetched = await svc.GetByIdAsync(created.PostId);
        Assert.NotNull(fetched);
        Assert.Equal("Hello", fetched!.Title);
        Assert.Equal(company.CompanyId, fetched.CompanyId);
    }

    [Fact]
    public async Task UpdateAsync_WhenMissing_ReturnsNull()
    {
        var ctx = TestDbContextFactory.Create();
        var svc = Create(ctx);
        var res = await svc.UpdateAsync(999, Req(title: "X"));
        Assert.Null(res);
    }

    [Fact]
    public async Task UpdateAsync_PersistsChanges_AndFallsBackTargetRoleToTitleWhenBlank()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var svc = Create(ctx);
        var created = await svc.CreateAsync(Req(title: "Original", targetRole: "OriginalRole"), company.CompanyId);

        var updated = await svc.UpdateAsync(created.PostId, Req(title: "Updated", targetRole: "   "));
        Assert.NotNull(updated);
        Assert.Equal("Updated", updated!.Title);
        Assert.Equal("Updated", updated.TargetRole);
    }

    [Fact]
    public async Task UpdateAsync_WithNullTitle_KeepsExistingTitle()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var svc = Create(ctx);
        var created = await svc.CreateAsync(Req(title: "KeepMe"), company.CompanyId);

        var updated = await svc.UpdateAsync(created.PostId, Req(title: null));
        Assert.NotNull(updated);
        Assert.Equal("KeepMe", updated!.Title);
    }

    [Fact]
    public async Task DeleteAsync_WhenMissing_ReturnsFalse()
    {
        var ctx = TestDbContextFactory.Create();
        var svc = Create(ctx);
        Assert.False(await svc.DeleteAsync(999));
    }

    [Fact]
    public async Task DeleteAsync_WhenExists_Removes()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var svc = Create(ctx);
        var created = await svc.CreateAsync(Req(title: "ToDelete"), company.CompanyId);

        Assert.True(await svc.DeleteAsync(created.PostId));
        Assert.Null(await svc.GetByIdAsync(created.PostId));
        Assert.Empty(await ctx.Posts.ToListAsync());
    }

    [Fact]
    public async Task SearchAsync_ClampsPageAndPageSize()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var svc = Create(ctx);
        for (int i = 0; i < 3; i++)
            await svc.CreateAsync(Req(title: $"Post {i}"), company.CompanyId);

        var resNegative = await svc.SearchAsync(new PostQueryParams(Page: -5, PageSize: -10));
        Assert.Equal(1, resNegative.Page);
        Assert.Equal(1, resNegative.PageSize);

        var resHuge = await svc.SearchAsync(new PostQueryParams(Page: 1, PageSize: 1000));
        Assert.Equal(100, resHuge.PageSize);
        Assert.Equal(3, resHuge.Total);
    }

    [Fact]
    public async Task SearchAsync_ReturnsPagedResults()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        var svc = Create(ctx);
        await svc.CreateAsync(Req(title: "Alpha"), company.CompanyId);
        await svc.CreateAsync(Req(title: "Beta"), company.CompanyId);

        var res = await svc.SearchAsync(new PostQueryParams(Page: 1, PageSize: 1));
        Assert.Equal(2, res.Total);
        Assert.Single(res.Items);
    }

    [Fact]
    public async Task BaseCreateAsync_TargetRoleFallback_ToTitle()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await CreateCompanyAsync(ctx);
        // Use BaseEntityService.CreateAsync(Post entity) path
        var repo = new PostRepository(ctx);
        var svc = new PostService(repo, NullLogger<PostService>.Instance);
        var post = new Post { CompanyId = company.CompanyId, Title = "Entity Title", TargetRole = "", CreatedAt = DateTime.UtcNow };
        var created = await svc.CreateAsync(post);
        Assert.Equal("Entity Title", created.TargetRole);
    }
}
