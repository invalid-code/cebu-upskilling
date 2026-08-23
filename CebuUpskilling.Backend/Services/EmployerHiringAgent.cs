using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Employer-side hiring agent. Mirrors <see cref="JobseekerSkillParserAgent"/>:
/// AI-assisted candidate ranking, job-post drafting, and company screening
/// question generation for recruiters.
/// </summary>
public interface IEmployerHiringAgent
{
    Task<RankCandidatesResponse> RankApplicantsAsync(int userId, int postId, CancellationToken ct = default);
    Task<DraftJobPostResponse?> DraftJobPostAsync(int userId, DraftJobPostRequest request, CancellationToken ct = default);
    Task<ScreeningQuestionsResponse> GenerateScreeningQuestionsAsync(int userId, int postId, int perSkill = 3, CancellationToken ct = default);
}

public class EmployerHiringAgent : IEmployerHiringAgent
{
    private readonly IGoogleAiService _ai;
    private readonly IApplicationRepository _applications;
    private readonly IPostRepository _posts;
    private readonly IRoleSkillRepository _roleSkills;
    private readonly IAssessmentQuestionRepository _assessmentQuestions;
    private readonly ILogger<EmployerHiringAgent> _logger;

    public EmployerHiringAgent(
        IGoogleAiService ai,
        IApplicationRepository applications,
        IPostRepository posts,
        IRoleSkillRepository roleSkills,
        IAssessmentQuestionRepository assessmentQuestions,
        ILogger<EmployerHiringAgent> logger)
    {
        _ai = ai;
        _applications = applications;
        _posts = posts;
        _roleSkills = roleSkills;
        _assessmentQuestions = assessmentQuestions;
        _logger = logger;
    }

    public async Task<RankCandidatesResponse> RankApplicantsAsync(int userId, int postId, CancellationToken ct = default)
    {
        var post = await _posts.GetByIdAsync(postId);
        if (post == null)
            return new RankCandidatesResponse(postId, AiRanked: false, Candidates: new List<RankedCandidateDto>());

        var applications = await _applications.GetByPostIdWithLearnerAndSkillsAsync(postId);
        if (applications.Count == 0)
        {
            _logger.LogInformation("No applicants to rank for post {PostId}", postId);
            return new RankCandidatesResponse(postId, AiRanked: false, Candidates: new List<RankedCandidateDto>());
        }

        var profiles = applications.Select(a => new CandidateSkillProfile(
            a.ApplicationId,
            a.Learner.LearnerSkills
                .Select(ls => $"{ls.Skill?.Name ?? "Unknown"}: {ls.CurrentLevel}")
                .ToList())).ToList();

        var rankings = await _ai.RankCandidatesAsync(post.Title, post.TargetRole, post.Requirements, profiles, ct);
        var rankingMap = rankings.ToDictionary(r => r.ApplicationId);

        var candidates = applications
            .Select(a => BuildRankedCandidate(a, rankingMap))
            .OrderByDescending(c => c.Score)
            .ThenByDescending(c => c.AppliedAt)
            .ToList();

        _logger.LogInformation("User {UserId} ranked {Count} applicants for post {PostId} (aiRanked: {AiRanked})",
            userId, candidates.Count, postId, rankings.Count > 0);
        return new RankCandidatesResponse(postId, AiRanked: rankings.Count > 0, Candidates: candidates);
    }

    public async Task<DraftJobPostResponse?> DraftJobPostAsync(int userId, DraftJobPostRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.TargetRole))
        {
            _logger.LogWarning("User {UserId} submitted incomplete job post draft request", userId);
            return null;
        }

        var draft = await _ai.DraftJobPostAsync(request, ct);
        if (draft == null)
            _logger.LogInformation("AI drafting unavailable for user {UserId}; returning null", userId);

        return draft;
    }

    public async Task<ScreeningQuestionsResponse> GenerateScreeningQuestionsAsync(
        int userId, int postId, int perSkill = 3, CancellationToken ct = default)
    {
        perSkill = Math.Clamp(perSkill, 1, 5);
        var post = await _posts.GetByIdAsync(postId);
        if (post == null || string.IsNullOrWhiteSpace(post.TargetRole))
            return new ScreeningQuestionsResponse(postId, new List<CreatedCompanyQuestionResponse>());

        var roleSkills = await _roleSkills.GetByTargetRoleWithSkillAsync(post.TargetRole);
        if (roleSkills.Count == 0)
        {
            _logger.LogInformation("No role skills found for target role {TargetRole} (post {PostId})",
                post.TargetRole, postId);
            return new ScreeningQuestionsResponse(postId, new List<CreatedCompanyQuestionResponse>());
        }

        var created = new List<CreatedCompanyQuestionResponse>();
        foreach (var roleSkill in roleSkills.Take(4))
        {
            var generated = await _ai.GenerateAssessmentQuestionsAsync(roleSkill.Skill.Name, perSkill, ct);
            foreach (var q in generated.Where(IsValidQuestion))
            {
                var question = new AssessmentQuestion
                {
                    SkillId = roleSkill.SkillId,
                    Text = q.Text.Trim(),
                    OptionA = q.OptionA.Trim(),
                    OptionB = q.OptionB.Trim(),
                    OptionC = q.OptionC.Trim(),
                    OptionD = q.OptionD.Trim(),
                    CorrectOption = q.CorrectOption,
                    Source = AssessmentSource.Company,
                    CompanyId = post.CompanyId,
                };

                await _assessmentQuestions.AddAsync(question);
                await _assessmentQuestions.SaveChangesAsync(ct);

                created.Add(new CreatedCompanyQuestionResponse(
                    question.AssessmentQuestionId,
                    question.SkillId,
                    question.Text,
                    "Company",
                    post.Company?.Name ?? string.Empty));
            }
        }

        _logger.LogInformation("User {UserId} generated {Count} screening questions for post {PostId}",
            userId, created.Count, postId);
        return new ScreeningQuestionsResponse(postId, created);
    }

    private static RankedCandidateDto BuildRankedCandidate(
        Application application, Dictionary<int, CandidateRanking> rankingMap)
    {
        var learnerName = $"{application.Learner.User?.FirstName} {application.Learner.User?.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(learnerName))
            learnerName = "Unknown learner";

        rankingMap.TryGetValue(application.ApplicationId, out var ranking);

        return new RankedCandidateDto(
            application.ApplicationId,
            application.LearnerId,
            learnerName,
            application.Status,
            application.AppliedAt,
            ranking?.Score ?? ComputeFallbackScore(application),
            ranking?.Rationale ?? "AI ranking unavailable — ordered by verified skill coverage.",
            application.Learner.LearnerSkills.Select(ls => ls.Skill?.Name ?? "Unknown").ToList());
    }

    private static bool IsValidQuestion(GeneratedAssessmentQuestion q)
        => !string.IsNullOrWhiteSpace(q.Text)
           && !string.IsNullOrWhiteSpace(q.OptionA)
           && !string.IsNullOrWhiteSpace(q.OptionB)
           && !string.IsNullOrWhiteSpace(q.OptionC)
           && !string.IsNullOrWhiteSpace(q.OptionD)
           && q.CorrectOption is >= 0 and <= 3;

    /// <summary>Deterministic fallback: skill levels (+1 for verified) scaled to 0-100.</summary>
    private static double ComputeFallbackScore(Application application)
    {
        var skills = application.Learner.LearnerSkills.ToList();
        if (skills.Count == 0)
            return 0;

        var total = skills.Sum(ls => ls.CurrentLevel + (ls.Verified ? 1 : 0));
        return Math.Round(total / (double)(skills.Count * 6) * 100, 1);
    }
}
