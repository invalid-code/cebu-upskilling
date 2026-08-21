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
}

public record ApplyOutcome(bool Success, ApplyFailure? Failure = null, ApplicationSummary? Application = null);

public interface IApplicationsService
{
    Task<List<ApplicationSummary>> GetMyApplicationsAsync(int userId);
    Task<ApplyOutcome> ApplyAsync(int userId, int postId);
    Task<bool> UpdateStatusAsync(int userId, int postId, string status);
}

public class ApplicationsService : IApplicationsService
{
    private readonly ILearnerRepository _learners;
    private readonly IPostRepository _posts;
    private readonly IApplicationRepository _applications;
    private readonly ILogger<ApplicationsService> _logger;

    public ApplicationsService(
        ILearnerRepository learners,
        IPostRepository posts,
        IApplicationRepository applications,
        ILogger<ApplicationsService> logger)
    {
        _learners = learners;
        _posts = posts;
        _applications = applications;
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

    public async Task<ApplyOutcome> ApplyAsync(int userId, int postId)
    {
        _logger.LogInformation("User {UserId} applying to post {PostId}", userId, postId);

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
        };

        await _applications.AddAsync(application);
        await _applications.SaveChangesAsync();

        var created = await _applications.GetByLearnerAndPostAsync(learner.LearnerId, postId);
        _logger.LogInformation("User {UserId} applied to post {PostId}", userId, postId);
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
            string.IsNullOrWhiteSpace(application.Post?.Schedule) ? "Full-time" : application.Post!.Schedule!
        );
    }
}
