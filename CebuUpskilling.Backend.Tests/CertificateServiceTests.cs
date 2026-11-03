using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class CertificateServiceTests
{
    private static CertificateService CreateService(ApplicationDbContext context) =>
        new(context, NullLogger<CertificateService>.Instance);

    private static async Task<(AppUser User, Learner Learner, Course Course)> SeedAsync(
        ApplicationDbContext context,
        bool issuesCertificate = true,
        int progressPercent = 100)
    {
        var company = new Company { Name = "Cebu Skills Academy" };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var user = new AppUser
        {
            FirstName = "Maria",
            LastName = "Santos",
            EmailAddress = $"maria-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = "Learner",
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var learner = new Learner { UserId = user.UserId };
        context.Learners.Add(learner);

        var course = new Course
        {
            GenreId = Guid.NewGuid(),
            CompanyId = company.CompanyId,
            Name = "Customer Support Essentials",
            Status = "Published",
            IssuesCertificate = issuesCertificate,
        };
        context.Courses.Add(course);
        await context.SaveChangesAsync();

        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = course.CourseId,
            Started = DateTime.UtcNow.AddDays(-3),
            LastTotalProgressPercent = progressPercent,
        });
        await context.SaveChangesAsync();

        return (user, learner, course);
    }

    [Fact]
    public async Task IssueIfEligibleAsync_WhenCourseDoesNotOfferCertificates_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (_, learner, course) = await SeedAsync(context, issuesCertificate: false);

        var result = await CreateService(context).IssueIfEligibleAsync(learner.LearnerId, course.CourseId);

        Assert.Null(result);
        Assert.Empty(context.CourseCertificates);
    }

    [Fact]
    public async Task IssueIfEligibleAsync_WhenLearnerHasNotCompleted_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var (_, learner, course) = await SeedAsync(context, progressPercent: 99);

        var result = await CreateService(context).IssueIfEligibleAsync(learner.LearnerId, course.CourseId);

        Assert.Null(result);
        Assert.Empty(context.CourseCertificates);
    }

    [Fact]
    public async Task IssueIfEligibleAsync_WhenEligible_CreatesIdempotentCertificateWithSnapshots()
    {
        var context = TestDbContextFactory.Create();
        var (_, learner, course) = await SeedAsync(context);
        var service = CreateService(context);

        var first = await service.IssueIfEligibleAsync(learner.LearnerId, course.CourseId);
        var second = await service.IssueIfEligibleAsync(learner.LearnerId, course.CourseId);

        Assert.NotNull(first);
        Assert.NotNull(second);
        Assert.Equal(first!.CertificateId, second!.CertificateId);
        Assert.Equal("Maria Santos", first.RecipientName);
        Assert.Equal("Customer Support Essentials", first.CourseName);
        Assert.Equal("Cebu Skills Academy", first.ProviderName);
        Assert.StartsWith("CU-", first.SerialNumber);
        Assert.Single(context.CourseCertificates);
    }

    [Fact]
    public async Task IssueForCompletedLearnersAsync_BackfillsOnlyCompletedLearners()
    {
        var context = TestDbContextFactory.Create();
        var (_, completedLearner, course) = await SeedAsync(context);
        var incompleteUser = new AppUser
        {
            FirstName = "Incomplete",
            LastName = "Learner",
            EmailAddress = "incomplete@example.com",
            Role = "Learner",
        };
        context.Users.Add(incompleteUser);
        await context.SaveChangesAsync();
        var incompleteLearner = new Learner { UserId = incompleteUser.UserId };
        context.Learners.Add(incompleteLearner);
        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = incompleteLearner.LearnerId,
            CourseId = course.CourseId,
            LastTotalProgressPercent = 40,
        });
        await context.SaveChangesAsync();

        var issued = await CreateService(context).IssueForCompletedLearnersAsync(course.CourseId);

        Assert.Equal(1, issued);
        var certificate = Assert.Single(context.CourseCertificates);
        Assert.Equal(completedLearner.LearnerId, certificate.LearnerId);
        Assert.Equal(1, await CreateService(context).CountForUserAsync(completedLearner.UserId));
    }

    [Fact]
    public async Task GetForUserAsync_ReturnsOnlyTheCallersCertificates()
    {
        var context = TestDbContextFactory.Create();
        var (user, learner, course) = await SeedAsync(context);
        var otherUser = new AppUser
        {
            FirstName = "Other",
            LastName = "Learner",
            EmailAddress = "other@example.com",
            Role = "Learner",
        };
        context.Users.Add(otherUser);
        await context.SaveChangesAsync();
        var otherLearner = new Learner { UserId = otherUser.UserId };
        context.Learners.Add(otherLearner);
        context.LearnerStudyCourses.Add(new LearnerStudyCourse
        {
            LearnerId = otherLearner.LearnerId,
            CourseId = course.CourseId,
            LastTotalProgressPercent = 100,
        });
        await context.SaveChangesAsync();

        var service = CreateService(context);
        await service.IssueIfEligibleAsync(learner.LearnerId, course.CourseId);
        await service.IssueIfEligibleAsync(otherLearner.LearnerId, course.CourseId);

        var mine = await service.GetForUserAsync(user.UserId);
        var theirs = await service.GetForUserAsync(otherUser.UserId);
        var crossAccountRead = await service.GetForUserAsync(user.UserId, theirs.Single().CertificateId);

        Assert.Single(mine);
        Assert.Single(theirs);
        Assert.Equal("Maria Santos", mine[0].RecipientName);
        Assert.Null(crossAccountRead);
    }

    [Fact]
    public async Task VerifyAsync_FindsCertificateBySerialIgnoringCase()
    {
        var context = TestDbContextFactory.Create();
        var (_, learner, course) = await SeedAsync(context);
        var service = CreateService(context);
        var issued = await service.IssueIfEligibleAsync(learner.LearnerId, course.CourseId);

        var verified = await service.VerifyAsync(issued!.SerialNumber.ToLowerInvariant());

        Assert.NotNull(verified);
        Assert.Equal(issued.CertificateId, verified!.CertificateId);
    }
}
