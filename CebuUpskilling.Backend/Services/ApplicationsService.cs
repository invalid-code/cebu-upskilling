using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using Microsoft.Extensions.Logging;

namespace CebuUpskilling.Backend.Services;

public enum ApplyFailure
{
    NoLearnerProfile,
    PostNotFound,
    AlreadyApplied,
    ResumeRequired,
}

public record ApplyOutcome(bool Success, ApplyFailure? Failure = null, ApplicationSummary? Application = null);

public enum EmployerApplicationFailure
{
    ApplicationNotFound,
    NotYourApplication,
    InvalidStatus,
}

public record EmployerApplicationOutcome(
    bool Success,
    EmployerApplicationFailure? Failure = null,
    ApplicationEmployerSummary? Application = null);

public record ApplicationEmployerDetailOutcome(
    bool Success,
    EmployerApplicationFailure? Failure = null,
    ApplicationEmployerDetailDto? Application = null);

public interface IApplicationsService
{
    Task<List<ApplicationSummary>> GetMyApplicationsAsync(int userId);
    Task<ApplyOutcome> ApplyAsync(int userId, int postId, string? resumeUrl = null, string? coverLetterUrl = null);
    Task<bool> UpdateStatusAsync(int userId, int postId, string status);
    Task<List<ApplicationEmployerSummary>> GetCompanyApplicationsAsync(int companyId);
    Task<ApplicationEmployerDetailOutcome> GetCompanyApplicationDetailAsync(int companyId, int applicationId);
    Task<EmployerApplicationOutcome> UpdateApplicationStatusAsync(int companyId, int applicationId, string status);
}

public class ApplicationsService : IApplicationsService
{
    private static readonly string[] ValidEmployerStatuses =
        ["applied", "review", "interview", "hired", "rejected"];

    private readonly ILearnerRepository _learners;
    private readonly IPostRepository _posts;
    private readonly IApplicationRepository _applications;
    private readonly IAppUserRepository _users;
    private readonly IEmailService _emailService;
    private readonly ILogger<ApplicationsService> _logger;

    public ApplicationsService(
        ILearnerRepository learners,
        IPostRepository posts,
        IApplicationRepository applications,
        IAppUserRepository users,
        IEmailService emailService,
        ILogger<ApplicationsService> logger)
    {
        _learners = learners;
        _posts = posts;
        _applications = applications;
        _users = users;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<List<ApplicationSummary>> GetMyApplicationsAsync(int userId)
    {
        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile found for user {UserId}", userId);
            return new List<ApplicationSummary>();
        }

        var apps = await _applications.GetByLearnerIdAsync(learner.LearnerId);
        return apps.Select(ToSummary).ToList();
    }

    public async Task<ApplyOutcome> ApplyAsync(int userId, int postId, string? resumeUrl = null, string? coverLetterUrl = null)
    {
        _logger.LogInformation("User {UserId} applying to post {PostId}", userId, postId);

        // A resume is mandatory: server-side enforcement so direct API calls cannot bypass it.
        if (string.IsNullOrWhiteSpace(resumeUrl))
        {
            _logger.LogWarning("User {UserId} application to post {PostId} rejected: no resume attached", userId, postId);
            return new ApplyOutcome(false, ApplyFailure.ResumeRequired);
        }

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogWarning("No learner profile found for user {UserId}", userId);
            return new ApplyOutcome(false, ApplyFailure.NoLearnerProfile);
        }

        var post = await _posts.GetByIdAsync(postId);
        if (post == null)
        {
            _logger.LogWarning("Post {PostId} not found", postId);
            return new ApplyOutcome(false, ApplyFailure.PostNotFound);
        }

        var existing = await _applications.GetByLearnerAndPostAsync(learner.LearnerId, postId);
        if (existing != null)
        {
            _logger.LogInformation("User {UserId} already applied to post {PostId}", userId, postId);
            return new ApplyOutcome(false, ApplyFailure.AlreadyApplied, ToSummary(existing));
        }

        var application = new Application
        {
            LearnerId = learner.LearnerId,
            PostId = postId,
            Status = "applied",
            AppliedAt = DateTime.UtcNow,
            ResumeUrl = resumeUrl,
            CoverLetterUrl = coverLetterUrl,
        };

        await _applications.AddAsync(application);
        await _applications.SaveChangesAsync();

        var created = await _applications.GetByLearnerAndPostAsync(learner.LearnerId, postId);
        _logger.LogInformation("User {UserId} applied to post {PostId}", userId, postId);

        await NotifyCompanyOfApplicationAsync(post, learner);

        return new ApplyOutcome(true, Application: ToSummary(created!));
    }

    public async Task<bool> UpdateStatusAsync(int userId, int postId, string status)
    {
        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null) return false;

        var application = await _applications.GetByLearnerAndPostAsync(learner.LearnerId, postId);
        if (application == null) return false;

        application.Status = status;
        if (status == "saved" && application.SavedAt == null)
        {
            application.SavedAt = DateTime.UtcNow;
        }

        await _applications.SaveChangesAsync();
        _logger.LogInformation("Updated post {PostId} status to {Status} for user {UserId}", postId, status, userId);
        return true;
    }

    public async Task<List<ApplicationEmployerSummary>> GetCompanyApplicationsAsync(int companyId)
    {
        _logger.LogInformation("Fetching applications for company {CompanyId}", companyId);
        var apps = await _applications.GetByCompanyIdAsync(companyId);
        return apps
            .OrderByDescending(a => a.AppliedAt)
            .Select(ToEmployerSummary)
            .ToList();
    }

    public async Task<EmployerApplicationOutcome> UpdateApplicationStatusAsync(int companyId, int applicationId, string status)
    {
        _logger.LogInformation("Company {CompanyId} updating application {ApplicationId} to {Status}", companyId, applicationId, status);

        if (!ValidEmployerStatuses.Contains(status))
        {
            _logger.LogWarning("Invalid status {Status} for application {ApplicationId}", status, applicationId);
            return new EmployerApplicationOutcome(false, EmployerApplicationFailure.InvalidStatus);
        }

        var application = await _applications.GetByIdWithLearnerAsync(applicationId);
        if (application == null)
        {
            _logger.LogWarning("Application {ApplicationId} not found", applicationId);
            return new EmployerApplicationOutcome(false, EmployerApplicationFailure.ApplicationNotFound);
        }

        if (application.Post.CompanyId != companyId)
        {
            _logger.LogWarning("Company {CompanyId} attempted to update application {ApplicationId} of another company", companyId, applicationId);
            return new EmployerApplicationOutcome(false, EmployerApplicationFailure.NotYourApplication);
        }

        application.Status = status;
        await _applications.SaveChangesAsync();
        _logger.LogInformation("Application {ApplicationId} set to {Status} by company {CompanyId}", applicationId, status, companyId);

        await NotifyLearnerOfStatusChangeAsync(application, status);

        return new EmployerApplicationOutcome(true, Application: ToEmployerSummary(application));
    }

    public async Task<ApplicationEmployerDetailOutcome> GetCompanyApplicationDetailAsync(int companyId, int applicationId)
    {
        _logger.LogInformation("Company {CompanyId} fetching detail for application {ApplicationId}", companyId, applicationId);

        var application = await _applications.GetByIdWithLearnerAndSkillsAsync(applicationId);
        if (application == null)
        {
            _logger.LogWarning("Application {ApplicationId} not found", applicationId);
            return new ApplicationEmployerDetailOutcome(false, EmployerApplicationFailure.ApplicationNotFound);
        }

        if (application.Post.CompanyId != companyId)
        {
            _logger.LogWarning("Company {CompanyId} attempted to view application {ApplicationId} of another company", companyId, applicationId);
            return new ApplicationEmployerDetailOutcome(false, EmployerApplicationFailure.NotYourApplication);
        }

        var learner = application.Learner;
        var learnerName = learner == null
            ? "Unknown learner"
            : $"{learner.User?.FirstName} {learner.User?.LastName}".Trim();

        if (string.IsNullOrWhiteSpace(learnerName))
            learnerName = "Unknown learner";

        var skills = (learner?.LearnerSkills ?? new List<LearnerSkill>())
            .OrderByDescending(ls => ls.CurrentLevel)
            .Select(ls => new ApplicantSkillDto(ls.Skill.Name, ls.CurrentLevel, ls.Verified))
            .ToList();

        var detail = new ApplicationEmployerDetailDto(
            application.ApplicationId,
            application.PostId,
            application.Post?.Title ?? string.Empty,
            learner?.LearnerId ?? 0,
            learnerName,
            learner?.User?.EmailAddress,
            learner?.User?.TargetRole,
            application.Status,
            application.AppliedAt,
            application.ResumeUrl,
            application.CoverLetterUrl,
            skills);

        return new ApplicationEmployerDetailOutcome(true, Application: detail);
    }

    private async Task NotifyCompanyOfApplicationAsync(Post post, Learner learner)
    {
        try
        {
            var emails = await _users.GetEmailsByCompanyIdAsync(post.CompanyId);
            if (emails.Count == 0) return;

            var learnerName = $"{learner.User?.FirstName} {learner.User?.LastName}".Trim();
            var body = $"""
                <p>A learner applied to your posting <b>{post.Title}</b>:</p>
                <ul>
                  <li><b>Applicant:</b> {learnerName}</li>
                  <li><b>Posting:</b> {post.Title}</li>
                </ul>
                <p>Log in to your dashboard to review the application.</p>
                """;

            foreach (var email in emails)
            {
                await _emailService.SendEmailAsync(email, $"New application for {post.Title}", body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to notify company {CompanyId} of a new application", post.CompanyId);
        }
    }

    private async Task NotifyLearnerOfStatusChangeAsync(Application application, string status)
    {
        try
        {
            var learnerEmail = application.Learner?.User?.EmailAddress;
            if (string.IsNullOrWhiteSpace(learnerEmail)) return;

            var body = $"""
                <p>Your application for <b>{application.Post?.Title}</b> has been updated to <b>{status}</b>.</p>
                <p>Check your applications page for details.</p>
                """;

            await _emailService.SendEmailAsync(learnerEmail, $"Application status update: {status}", body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to notify learner about application {ApplicationId} status change", application.ApplicationId);
        }
    }

    private static ApplicationSummary ToSummary(Application application)
    {
        var postTitle = application.Post?.Title ?? string.Empty;
        var targetRole = application.Post?.TargetRole;

        if (string.IsNullOrWhiteSpace(targetRole))
            targetRole = postTitle;

        return new ApplicationSummary(
            application.PostId,
            postTitle,
            application.Post?.Company?.Name ?? "Unknown",
            targetRole,
            application.Status,
            application.AppliedAt,
            application.SavedAt,
            application.ResumeUrl,
            application.CoverLetterUrl,
            string.IsNullOrWhiteSpace(application.Post?.Schedule) ? "Full-time" : application.Post!.Schedule!
        );
    }

    private static ApplicationEmployerSummary ToEmployerSummary(Application application)
    {
        var learner = application.Learner;
        var learnerName = learner == null
            ? "Unknown learner"
            : $"{learner.User?.FirstName} {learner.User?.LastName}".Trim();

        if (string.IsNullOrWhiteSpace(learnerName))
            learnerName = "Unknown learner";

        return new ApplicationEmployerSummary(
            application.ApplicationId,
            application.PostId,
            application.Post?.Title ?? string.Empty,
            learner?.LearnerId ?? 0,
            learnerName,
            learner?.User?.EmailAddress,
            application.Status,
            application.AppliedAt,
            application.ResumeUrl,
            application.CoverLetterUrl
        );
    }
}