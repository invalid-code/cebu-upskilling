using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class ApplicationsServiceTests
{
    private const string TestResumeUrl = "https://storage.example/resume.pdf";

    private static ApplicationsService CreateService(ApplicationDbContext context) => new(
        new LearnerRepository(context),
        new PostRepository(context),
        new ApplicationRepository(context),
        new AppUserRepository(context),
        new LoggingEmailService(NullLogger<LoggingEmailService>.Instance),
        NullLogger<ApplicationsService>.Instance
    );

    private static async Task<(ApplicationDbContext context, int userId, int postId)> SeedAsync()
    {
        var context = TestDbContextFactory.Create();

        var user = new AppUser
        {
            FirstName = "Maria",
            LastName = "Santos",
            EmailAddress = "maria@example.com",
            PasswordHash = "x",
            Role = "Learner",
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var learner = new Learner { UserId = user.UserId };
        context.Learners.Add(learner);
        await context.SaveChangesAsync();

        var company = new Company { Name = "Serbisyo Digital" };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        user.CompanyId = company.CompanyId;
        await context.SaveChangesAsync();

        var post = new Post
        {
            CompanyId = company.CompanyId,
            Title = "Frontend Developer (React)",
        };
        context.Posts.Add(post);
        await context.SaveChangesAsync();

        return (context, user.UserId, post.PostId);
    }

    [Fact]
    public async Task ApplyAsync_CreatesApplicationAndReturnsSummary()
    {
        var (context, userId, postId) = await SeedAsync();
        var service = CreateService(context);

        var outcome = await service.ApplyAsync(userId, postId, TestResumeUrl);

        Assert.True(outcome.Success);
        Assert.NotNull(outcome.Application);
        Assert.Equal(postId, outcome.Application!.PostId);
        Assert.Equal("Frontend Developer (React)", outcome.Application.Title);
        Assert.Equal("Serbisyo Digital", outcome.Application.Company);
        Assert.Equal("applied", outcome.Application.Status);

        var stored = await context.Applications.SingleAsync();
        Assert.Equal(postId, stored.PostId);
        Assert.Equal("applied", stored.Status);
    }

    [Fact]
    public async Task GetMyApplicationsAsync_ReturnsLearnerApplications()
    {
        var (context, userId, postId) = await SeedAsync();
        var service = CreateService(context);

        await service.ApplyAsync(userId, postId, TestResumeUrl);
        var apps = await service.GetMyApplicationsAsync(userId);

        Assert.Single(apps);
        Assert.Equal(postId, apps[0].PostId);
    }

    [Fact]
    public async Task ApplyAsync_IsIdempotent()
    {
        var (context, userId, postId) = await SeedAsync();
        var service = CreateService(context);

        await service.ApplyAsync(userId, postId, TestResumeUrl);
        var second = await service.ApplyAsync(userId, postId, TestResumeUrl);

        Assert.False(second.Success);
        Assert.Equal(ApplyFailure.AlreadyApplied, second.Failure);
        Assert.Single(context.Applications);
    }

    [Fact]
    public async Task ApplyAsync_UnknownPost_ReturnsPostNotFound()
    {
        var (context, userId, _) = await SeedAsync();
        var service = CreateService(context);

        var outcome = await service.ApplyAsync(userId, 999, TestResumeUrl);

        Assert.False(outcome.Success);
        Assert.Equal(ApplyFailure.PostNotFound, outcome.Failure);
    }

    [Fact]
    public async Task ApplyAsync_NoLearnerProfile_ReturnsNoLearnerProfile()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var outcome = await service.ApplyAsync(12345, 1, TestResumeUrl);

        Assert.False(outcome.Success);
        Assert.Equal(ApplyFailure.NoLearnerProfile, outcome.Failure);
    }

    [Fact]
    public async Task ApplyAsync_WithoutResume_ReturnsResumeRequired()
    {
        var (context, userId, postId) = await SeedAsync();
        var service = CreateService(context);

        var outcome = await service.ApplyAsync(userId, postId, resumeUrl: null);

        Assert.False(outcome.Success);
        Assert.Equal(ApplyFailure.ResumeRequired, outcome.Failure);
        Assert.Empty(context.Applications);
    }

    [Fact]
    public async Task ApplyAsync_WithoutResumeUrl_AppendsLearnerStoredResume()
    {
        var (context, userId, postId) = await SeedAsync();
        var user = await context.Users.SingleAsync(u => u.UserId == userId);
        user.ResumeUrl = "https://storage.example/profile-resume.pdf";
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var outcome = await service.ApplyAsync(userId, postId, resumeUrl: null);

        Assert.True(outcome.Success);
        var stored = await context.Applications.SingleAsync();
        Assert.Equal("https://storage.example/profile-resume.pdf", stored.ResumeUrl);
        Assert.Equal("https://storage.example/profile-resume.pdf", outcome.Application!.ResumeUrl);
    }

    [Fact]
    public async Task ApplyAsync_ExplicitResumeUrl_WinsOverStoredResume()
    {
        var (context, userId, postId) = await SeedAsync();
        var user = await context.Users.SingleAsync(u => u.UserId == userId);
        user.ResumeUrl = "https://storage.example/profile-resume.pdf";
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var outcome = await service.ApplyAsync(userId, postId, "https://storage.example/fresh-resume.pdf");

        Assert.True(outcome.Success);
        var stored = await context.Applications.SingleAsync();
        Assert.Equal("https://storage.example/fresh-resume.pdf", stored.ResumeUrl);
    }

    [Fact]
    public async Task UpdateStatusAsync_ChangesStatus()
    {
        var (context, userId, postId) = await SeedAsync();
        var service = CreateService(context);

        await service.ApplyAsync(userId, postId, TestResumeUrl);
        var updated = await service.UpdateStatusAsync(userId, postId, "interview");

        Assert.True(updated);
        var stored = await context.Applications.SingleAsync();
        Assert.Equal("interview", stored.Status);
    }

    [Fact]
    public async Task GetMyApplicationsAsync_NoLearner_ReturnsEmpty()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var apps = await service.GetMyApplicationsAsync(999);

        Assert.Empty(apps);
    }
}
