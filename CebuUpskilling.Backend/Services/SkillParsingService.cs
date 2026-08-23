using System.Collections.Generic;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging;

namespace CebuUpskilling.Backend.Services;

public interface ISkillParsingService
{
    Task<ParseSkillsResult> ParseAndCreateAssessmentsAsync(int userId, string resumeText, CancellationToken ct = default);
}

[Obsolete("Use JobseekerSkillParserAgent instead. This implementation is retained for backwards-compatibility; new code should use JobseekerSkillParserAgent.")]
public class SkillParsingService : ISkillParsingService
{
    private readonly IGoogleAiService _ai;
    private readonly ISkillRepository _skills;
    private readonly ILearnerRepository _learners;
    private readonly ILearnerSkillRepository _learnerSkills;
    private readonly ILearnerAssessmentRepository _learnerAssessments;
    private readonly ILogger<SkillParsingService> _logger;

    public SkillParsingService(
        IGoogleAiService ai,
        ISkillRepository skills,
        ILearnerRepository learners,
        ILearnerSkillRepository learnerSkills,
        ILearnerAssessmentRepository learnerAssessments,
        ILogger<SkillParsingService> logger)
    {
        _ai = ai;
        _skills = skills;
        _learners = learners;
        _learnerSkills = learnerSkills;
        _learnerAssessments = learnerAssessments;
        _logger = logger;
    }

    public async Task<ParseSkillsResult> ParseAndCreateAssessmentsAsync(int userId, string resumeText, CancellationToken ct = default)
    {
        var names = await _ai.ParseSkillsFromResumeAsync(resumeText, ct);
        if (names.Count == 0)
        {
            _logger.LogInformation("No skills parsed from resume for user {UserId}", userId);
            return new ParseSkillsResult(new List<ParsedSkillResult>());
        }

        var skills = await UpsertSkillsAsync(names);
        await _skills.SaveChangesAsync(ct);

        var learner = await _learners.GetByUserIdAsync(userId);
        if (learner == null)
        {
            _logger.LogWarning("No learner profile found for user {UserId}; skipping assessment creation", userId);
            return new ParseSkillsResult(skills.Select(s => new ParsedSkillResult(s.Name, s.SkillId, null)).ToList());
        }

        var existingAssessments = await _learnerAssessments.GetByLearnerIdAsync(learner.LearnerId);
        var assessmentSkillIds = new HashSet<int>(existingAssessments.Select(a => a.SkillId));

        var createdAssessments = new List<LearnerAssessment>();
        var results = new List<(Skill Skill, LearnerAssessment? Assessment)>();

        foreach (var skill in skills)
        {
            var learnerSkill = await _learnerSkills.GetByLearnerAndSkillAsync(learner.LearnerId, skill.SkillId);
            if (learnerSkill == null)
            {
                learnerSkill = new LearnerSkill
                {
                    LearnerId = learner.LearnerId,
                    SkillId = skill.SkillId,
                    CurrentLevel = 0,
                    Verified = false,
                };
                await _learnerSkills.AddAsync(learnerSkill);
            }

            LearnerAssessment? assessment = null;
            if (!assessmentSkillIds.Contains(skill.SkillId))
            {
                assessment = new LearnerAssessment
                {
                    LearnerId = learner.LearnerId,
                    SkillId = skill.SkillId,
                    ScoredLevel = 0,
                    Verified = false,
                    CompletedAt = DateTime.UtcNow,
                };
                await _learnerAssessments.AddAsync(assessment);
                createdAssessments.Add(assessment);
                assessmentSkillIds.Add(skill.SkillId);
            }

            results.Add((skill, assessment));
        }

        await _learnerSkills.SaveChangesAsync(ct);
        await _learnerAssessments.SaveChangesAsync(ct);

        var parsed = results.Select(r => new ParsedSkillResult(
            r.Skill.Name,
            r.Skill.SkillId,
            r.Assessment == null ? (int?)null : r.Assessment.LearnerAssessmentId
        )).ToList();

        _logger.LogInformation("Parsed {Parsed} skills and created {Created} assessments for user {UserId}",
            parsed.Count, createdAssessments.Count, userId);

        return new ParseSkillsResult(parsed);
    }

    private async Task<List<Skill>> UpsertSkillsAsync(IEnumerable<string> names)
    {
        var normalizedNames = names
            .Select(n => n?.Trim())
            .Where(n => !string.IsNullOrWhiteSpace(n) && n.Length <= 100)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(n => n!)
            .ToList();

        var existing = await _skills.GetByNamesAsync(normalizedNames);
        var existingByNormalized = existing.ToDictionary(s => s.Name, StringComparer.OrdinalIgnoreCase);

        var skills = new List<Skill>();
        foreach (var name in normalizedNames)
        {
            if (existingByNormalized.TryGetValue(name, out var skill))
            {
                skills.Add(skill);
            }
            else
            {
                var created = new Skill { Name = name, Category = null };
                await _skills.AddAsync(created);
                skills.Add(created);
            }
        }

        return skills;
    }
}
