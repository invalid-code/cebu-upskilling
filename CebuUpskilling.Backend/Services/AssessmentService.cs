using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

public interface IAssessmentService
{
    Task<List<AssessmentResultResponse>> GetRecentResultsAsync(int userId);
    Task<RecommendedAssessmentResponse?> GetRecommendedAsync(int userId);
    Task<AvailableAssessmentsResponse?> GetAvailableAssessmentsAsync(int userId);
    Task<StartAssessmentResponse?> StartAssessmentAsync(int userId, StartAssessmentRequest request);
    Task<AssessmentQuestionsResponse?> GetQuestionsAsync(int userId, int assessmentId);
    Task<SubmitAssessmentResponse?> SubmitAssessmentAsync(int userId, int assessmentId, SubmitAssessmentRequest request);
}

public class AssessmentService : IAssessmentService
{
    private readonly IAppUserRepository _users;
    private readonly IRoleSkillRepository _roleSkills;
    private readonly ILearnerRepository _learners;
    private readonly ILearnerSkillRepository _learnerSkills;
    private readonly ILearnerAssessmentRepository _learnerAssessments;
    private readonly IAssessmentQuestionRepository _assessmentQuestions;
    private readonly ISkillRepository _skills;
    private readonly ILogger<AssessmentService> _logger;

    private static readonly Dictionary<int, string> LevelLabels = new()
    {
        { 1, "No Knowledge" },
        { 2, "Beginner" },
        { 3, "Intermediate" },
        { 4, "Advanced" },
        { 5, "Expert" },
    };

    public AssessmentService(
        IAppUserRepository users,
        IRoleSkillRepository roleSkills,
        ILearnerRepository learners,
        ILearnerSkillRepository learnerSkills,
        ILearnerAssessmentRepository learnerAssessments,
        IAssessmentQuestionRepository assessmentQuestions,
        ISkillRepository skills,
        ILogger<AssessmentService> logger)
    {
        _users = users;
        _roleSkills = roleSkills;
        _learners = learners;
        _learnerSkills = learnerSkills;
        _learnerAssessments = learnerAssessments;
        _assessmentQuestions = assessmentQuestions;
        _skills = skills;
        _logger = logger;
    }

    public async Task<List<AssessmentResultResponse>> GetRecentResultsAsync(int userId)
    {
        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogInformation("No learner profile for user {UserId}", userId);
            return new List<AssessmentResultResponse>();
        }

        var results = (await _learnerAssessments.GetVerifiedByLearnerIdAsync(learner.LearnerId))
            .Select(a => new AssessmentResultResponse(
                a.LearnerAssessmentId,
                a.SkillId,
                a.Skill.Name,
                a.ScoredLevel,
                LevelLabels.ContainsKey(a.ScoredLevel) ? LevelLabels[a.ScoredLevel] : $"Level {a.ScoredLevel}",
                a.Verified,
                a.CompletedAt
            )).ToList();

        _logger.LogInformation("Returning {Count} verified results for user {UserId}", results.Count, userId);
        return results;
    }

    public async Task<RecommendedAssessmentResponse?> GetRecommendedAsync(int userId)
    {
        var user = await _users.GetByIdAsync(userId);
        if (user?.TargetRole == null)
        {
            _logger.LogInformation("User {UserId} has no target role", userId);
            return null;
        }

        var roleSkills = await _roleSkills.GetByTargetRoleWithSkillAsync(user.TargetRole);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null) return null;

        var learnerSkills = await _learnerSkills.GetByLearnerIdWithSkillAsync(learner.LearnerId);

        var learnerSkillMap = learnerSkills.ToDictionary(ls => ls.SkillId);

        var gaps = roleSkills
            .Select(rs =>
            {
                var hasSkill = learnerSkillMap.TryGetValue(rs.SkillId, out var ls);
                var currentLevel = hasSkill ? ls!.CurrentLevel : 0;
                var gap = Math.Max(0, rs.RequiredLevel - currentLevel);
                return new { rs.Skill, rs.RequiredLevel, CurrentLevel = currentLevel, Gap = gap };
            })
            .Where(g => g.Gap > 0)
            .OrderByDescending(g => g.Gap)
            .ThenBy(g => g.Skill.Name)
            .ToList();

        if (gaps.Count == 0)
        {
            _logger.LogInformation("User {UserId} has no skill gaps for role {Role}", userId, user.TargetRole);
            return null;
        }

        var top = gaps.First();
        var result = new RecommendedAssessmentResponse(
            SkillId: top.Skill.SkillId,
            SkillName: top.Skill.Name,
            Category: top.Skill.Category,
            CurrentLevel: top.CurrentLevel,
            CurrentLevelLabel: LevelLabels.GetValueOrDefault(top.CurrentLevel, $"Level {top.CurrentLevel}"),
            TargetLevel: top.RequiredLevel,
            TargetLevelLabel: LevelLabels.GetValueOrDefault(top.RequiredLevel, $"Level {top.RequiredLevel}"),
            Gap: top.Gap
        );

        _logger.LogInformation("Recommended assessment for user {UserId}: {Skill} (gap {Gap})",
            userId, result.SkillName, result.Gap);

        return result;
    }

    public async Task<AvailableAssessmentsResponse?> GetAvailableAssessmentsAsync(int userId)
    {
        var user = await _users.GetByIdAsync(userId);
        if (user?.TargetRole == null)
        {
            _logger.LogInformation("User {UserId} has no target role", userId);
            return null;
        }

        var roleSkills = await _roleSkills.GetByTargetRoleWithSkillAsync(user.TargetRole);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null) return null;

        var learnerSkills = await _learnerSkills.GetByLearnerIdWithSkillAsync(learner.LearnerId);
        var learnerSkillMap = learnerSkills.ToDictionary(ls => ls.SkillId);

        var learnerAssessments = await _learnerAssessments.GetByLearnerIdAsync(learner.LearnerId);
        var assessmentsBySkill = learnerAssessments
            .Where(a => a.Verified)
            .GroupBy(a => a.SkillId)
            .ToDictionary(g => g.Key, g => g.First());

        var skillIds = roleSkills.Select(rs => rs.SkillId).ToList();
        var questionCounts = await _assessmentQuestions.GetQuestionCountsBySkillIdsAsync(skillIds);

        var assessments = roleSkills
            .Select(rs =>
            {
                var hasSkill = learnerSkillMap.TryGetValue(rs.SkillId, out var ls);
                var currentLevel = hasSkill ? ls!.CurrentLevel : 0;
                var gap = Math.Max(0, rs.RequiredLevel - currentLevel);
                var hasAssessment = assessmentsBySkill.ContainsKey(rs.SkillId);

                return new AvailableAssessmentDto(
                    SkillId: rs.Skill.SkillId,
                    SkillName: rs.Skill.Name,
                    Category: rs.Skill.Category,
                    CurrentLevel: currentLevel,
                    CurrentLevelLabel: LevelLabels.GetValueOrDefault(currentLevel, $"Level {currentLevel}"),
                    TargetLevel: rs.RequiredLevel,
                    TargetLevelLabel: LevelLabels.GetValueOrDefault(rs.RequiredLevel, $"Level {rs.RequiredLevel}"),
                    Gap: gap,
                    HasAssessment: hasAssessment,
                    QuestionCount: questionCounts.GetValueOrDefault(rs.SkillId, 0),
                    TimeLimitMinutes: 45
                );
            })
            .OrderByDescending(a => a.Gap)
            .ThenBy(a => a.SkillName)
            .ToList();

        var verifiedSkillsCount = learnerSkills.Count(ls => ls.Verified);
        var recommendedCount = assessments.Count(a => a.Gap > 0);

        var totalRequired = roleSkills.Sum(rs => rs.RequiredLevel);
        var totalCurrent = roleSkills.Sum(rs =>
            learnerSkillMap.TryGetValue(rs.SkillId, out var ls) ? ls.CurrentLevel : 0);
        var matchPercent = totalRequired > 0 ? (int)Math.Round((double)totalCurrent / totalRequired * 100) : 0;

        var response = new AvailableAssessmentsResponse(
            Assessments: assessments,
            MatchPercent: matchPercent,
            VerifiedSkillsCount: verifiedSkillsCount,
            RecommendedCount: recommendedCount
        );

        _logger.LogInformation("Returning {Count} available assessments for user {UserId}", assessments.Count, userId);

        return response;
    }

    public async Task<StartAssessmentResponse?> StartAssessmentAsync(int userId, StartAssessmentRequest request)
    {
        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogWarning("No learner profile for user {UserId}", userId);
            return null;
        }

        var skill = await _skills.GetByIdAsync(request.SkillId);
        if (skill == null)
        {
            _logger.LogWarning("Skill {SkillId} not found", request.SkillId);
            return null;
        }

        var assessment = new LearnerAssessment
        {
            LearnerId = learner.LearnerId,
            SkillId = request.SkillId,
            ScoredLevel = 0,
            Verified = false,
            CompletedAt = DateTime.UtcNow
        };

        await _learnerAssessments.AddAsync(assessment);
        await _learnerAssessments.SaveChangesAsync();

        _logger.LogInformation("Started assessment {AssessmentId} for user {UserId} on skill {Skill}",
            assessment.LearnerAssessmentId, userId, skill.Name);

        return new StartAssessmentResponse(
            AssessmentId: assessment.LearnerAssessmentId,
            SkillId: skill.SkillId,
            SkillName: skill.Name,
            TimeLimitMinutes: 45
        );
    }

    public async Task<AssessmentQuestionsResponse?> GetQuestionsAsync(int userId, int assessmentId)
    {
        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null) return null;

        var assessment = await _learnerAssessments.GetByIdForLearnerAsync(assessmentId, learner.LearnerId);

        if (assessment == null)
        {
            _logger.LogWarning("Assessment {AssessmentId} not found for user {UserId}", assessmentId, userId);
            return null;
        }

        var questions = await _assessmentQuestions.GetBySkillIdAsync(assessment.SkillId);

        if (questions.Count == 0)
        {
            _logger.LogWarning("No questions found for skill {SkillId}", assessment.SkillId);
            return new AssessmentQuestionsResponse(
                assessmentId,
                assessment.Skill.Name,
                45,
                new List<AssessmentQuestionDto>()
            );
        }

        var random = new Random();
        var selectedQuestions = questions.OrderBy(_ => random.Next()).Take(5).ToList();

        var questionDtos = selectedQuestions.Select(q => new AssessmentQuestionDto(
            QuestionId: q.AssessmentQuestionId,
            Text: q.Text,
            Options: q.Options
        )).ToList();

        return new AssessmentQuestionsResponse(
            AssessmentId: assessment.LearnerAssessmentId,
            SkillName: assessment.Skill.Name,
            TimeLimitMinutes: 45,
            Questions: questionDtos
        );
    }

    public async Task<SubmitAssessmentResponse?> SubmitAssessmentAsync(int userId, int assessmentId, SubmitAssessmentRequest request)
    {
        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null) return null;

        var assessment = await _learnerAssessments.GetByIdForLearnerAsync(assessmentId, learner.LearnerId);

        if (assessment == null)
        {
            _logger.LogWarning("Assessment {AssessmentId} not found for user {UserId}", assessmentId, userId);
            return null;
        }

        if (assessment.Verified)
        {
            _logger.LogWarning("Assessment {AssessmentId} already completed", assessmentId);
            return null;
        }

        var dbQuestions = await _assessmentQuestions.GetBySkillIdDictionaryAsync(assessment.SkillId);

        int correctAnswers = 0;
        foreach (var answer in request.Answers)
        {
            if (dbQuestions.TryGetValue(answer.QuestionId, out var question)
                && answer.SelectedOption == question.CorrectOption)
            {
                correctAnswers++;
            }
        }

        var totalQuestions = request.Answers.Count;
        var scorePercent = totalQuestions > 0 ? (int)Math.Round((double)correctAnswers / totalQuestions * 100) : 0;
        var scoredLevel = CalculateLevel(scorePercent);

        assessment.ScoredLevel = scoredLevel;
        assessment.Verified = true;
        assessment.CompletedAt = DateTime.UtcNow;

        var learnerSkill = await _learnerSkills.GetByLearnerAndSkillAsync(learner.LearnerId, assessment.SkillId);

        if (learnerSkill == null)
        {
            learnerSkill = new LearnerSkill
            {
                LearnerId = learner.LearnerId,
                SkillId = assessment.SkillId,
                CurrentLevel = scoredLevel,
                Verified = true
            };
            await _learnerSkills.AddAsync(learnerSkill);
        }
        else if (scoredLevel > learnerSkill.CurrentLevel)
        {
            learnerSkill.CurrentLevel = scoredLevel;
            learnerSkill.Verified = true;
        }

        await _learnerAssessments.SaveChangesAsync();

        _logger.LogInformation("Assessment {AssessmentId} submitted: {Correct}/{Total} ({Percent}%), level {Level}",
            assessmentId, correctAnswers, totalQuestions, scorePercent, scoredLevel);

        return new SubmitAssessmentResponse(
            AssessmentId: assessment.LearnerAssessmentId,
            SkillId: assessment.SkillId,
            SkillName: assessment.Skill.Name,
            ScorePercent: scorePercent,
            CorrectAnswers: correctAnswers,
            TotalQuestions: totalQuestions,
            ScoredLevel: scoredLevel,
            LevelLabel: LevelLabels.GetValueOrDefault(scoredLevel, $"Level {scoredLevel}"),
            Verified: true,
            CompletedAt: assessment.CompletedAt
        );
    }

    private static int CalculateLevel(int scorePercent)
    {
        return scorePercent switch
        {
            >= 90 => 5,
            >= 70 => 4,
            >= 50 => 3,
            >= 30 => 2,
            _ => 1,
        };
    }
}
