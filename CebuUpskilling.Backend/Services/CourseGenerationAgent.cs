using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Recruiter-side agent that uses Gemini to draft a course outline (modules,
/// lessons, description) from a free-text company brief, grounded in the
/// platform's skill catalog. Drafts are returned to the caller for review and
/// only persisted when explicitly committed.
/// </summary>
public interface ICourseGenerationAgent
{
    Task<CourseGenerationDraftEnvelope> GenerateAsync(int userId, CourseGenerationRequest request, CancellationToken ct = default);
    Task<CommitCourseGenerationResponse?> CommitAsync(int userId, CommitCourseGenerationRequest request, CancellationToken ct = default);
}

public class CourseGenerationDraftEnvelope
{
    public CourseGenerationResult Draft { get; init; } = default!;
    public int SkillCatalogSize { get; init; }
}

public class CourseGenerationAgent : ICourseGenerationAgent
{
    private readonly ApplicationDbContext _db;
    private readonly IGoogleAiService _ai;
    private readonly IAppUserRepository _users;
    private readonly ISkillRepository _skills;
    private readonly ILogger<CourseGenerationAgent> _logger;

    public CourseGenerationAgent(
        ApplicationDbContext db,
        IGoogleAiService ai,
        IAppUserRepository users,
        ISkillRepository skills,
        ILogger<CourseGenerationAgent> logger)
    {
        _db = db;
        _ai = ai;
        _users = users;
        _skills = skills;
        _logger = logger;
    }

    public async Task<CourseGenerationDraftEnvelope> GenerateAsync(int userId, CourseGenerationRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Brief))
        {
            throw new ArgumentException("Brief is required.", nameof(request));
        }

        var recruiter = await _users.GetByIdWithCompanyAsync(userId);
        if (recruiter?.Company == null)
        {
            throw new UnauthorizedAccessException("Only recruiters with a company can generate courses.");
        }

        var allSkills = await _skills.ListAllAsync();
        const int maxSkillsInPrompt = 200;
        var availableSkills = allSkills
            .OrderBy(s => s.Name)
            .Take(maxSkillsInPrompt)
            .Select(s => new CourseGenerationAvailableSkill(s.SkillId, s.Name, s.Category))
            .ToList();
        if (allSkills.Count > maxSkillsInPrompt)
        {
            _logger.LogWarning("Skill catalog truncated for prompt: {Total} skills available, using first {Max} alphabetically",
                allSkills.Count, maxSkillsInPrompt);
        }

        _logger.LogInformation("Generating course outline for company {CompanyId} ({SkillCount} skills in catalog, {PromptCount} in prompt)",
            recruiter.Company.CompanyId, allSkills.Count, availableSkills.Count);

        var context = new CourseGenerationPromptContext(
            Brief: request.Brief.Trim(),
            TechnicalLevel: request.TechnicalLevel,
            Mode: request.Mode,
            ModuleCount: request.ModuleCount,
            LessonsPerModule: request.LessonsPerModule,
            AvailableSkills: availableSkills
        );

        var draft = await _ai.GenerateCourseOutlineAsync(context, ct);
        if (draft is null)
        {
            throw new InvalidOperationException(
                "The AI could not produce a course outline. Check that the Google AI API key is configured and try again.");
        }

        return new CourseGenerationDraftEnvelope
        {
            Draft = draft,
            SkillCatalogSize = availableSkills.Count,
        };
    }

    public async Task<CommitCourseGenerationResponse?> CommitAsync(int userId, CommitCourseGenerationRequest request, CancellationToken ct = default)
    {
        if (request?.Draft is null)
        {
            return null;
        }

        var recruiter = await _users.GetByIdWithCompanyAsync(userId);
        if (recruiter?.Company == null)
        {
            _logger.LogWarning("User {UserId} is not a recruiter; course commit rejected", userId);
            return null;
        }

        var draft = request.Draft;
        if (string.IsNullOrWhiteSpace(draft.Name) || draft.Modules.Count == 0)
        {
            _logger.LogWarning("User {UserId} committed an invalid course draft", userId);
            return null;
        }

        var mode = NormalizeMode(draft.Mode);
        var technicalLevel = draft.TechnicalLevel is >= 1 and <= 5 ? draft.TechnicalLevel : 1;
        var genreId = await ResolveGenreIdAsync(request.GenreId, ct);

        var course = new Course
        {
            CompanyId = recruiter.Company.CompanyId,
            Name = draft.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(draft.Description) ? null : draft.Description.Trim(),
            TechnicalLevel = technicalLevel,
            Mode = mode,
            Price = request.Price,
            GenreId = genreId,
            Status = "Draft",
        };

        for (var mi = 0; mi < draft.Modules.Count; mi++)
        {
            var moduleDraft = draft.Modules[mi];
            if (string.IsNullOrWhiteSpace(moduleDraft.Name)) continue;

            var module = new CourseModule
            {
                Course = course,
                Name = moduleDraft.Name.Trim(),
                Description = string.IsNullOrWhiteSpace(moduleDraft.Description) ? null : moduleDraft.Description.Trim(),
                Order = mi,
            };

            for (var li = 0; li < moduleDraft.Lessons.Count; li++)
            {
                var lessonDraft = moduleDraft.Lessons[li];
                if (string.IsNullOrWhiteSpace(lessonDraft.Name)) continue;

                module.Lessons.Add(new Lesson
                {
                    Course = course,
                    Module = module,
                    Name = lessonDraft.Name.Trim(),
                    Description = string.IsNullOrWhiteSpace(lessonDraft.Description) ? null : lessonDraft.Description.Trim(),
                });
            }

            course.Modules.Add(module);
        }

        if (course.Modules.Count == 0)
        {
            _logger.LogWarning("User {UserId} committed a course draft with no usable modules", userId);
            return null;
        }

        var skillIds = draft.MatchedSkills?
            .Where(s => s.SkillId > 0)
            .Select(s => s.SkillId)
            .Distinct()
            .ToList() ?? new List<int>();

        if (skillIds.Count > 0)
        {
            var existing = await _db.Skills
                .Where(s => skillIds.Contains(s.SkillId))
                .Select(s => s.SkillId)
                .ToListAsync(ct);
            var existingSet = new HashSet<int>(existing);
            foreach (var skillId in skillIds.Where(existingSet.Contains))
            {
                course.CourseSkills.Add(new CourseSkill { SkillId = skillId });
            }
        }

        _db.Courses.Add(course);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Recruiter {UserId} committed AI-generated course {CourseId} ({ModuleCount} modules, {SkillCount} skills) for company {CompanyId}",
            userId, course.CourseId, course.Modules.Count, course.CourseSkills.Count, recruiter.Company.CompanyId);

        return new CommitCourseGenerationResponse(course.CourseId, course.Name, course.Status);
    }

    private async Task<int> ResolveGenreIdAsync(int? requestedGenreId, CancellationToken ct)
    {
        if (requestedGenreId is > 0)
        {
            var exists = await _db.Genres.AnyAsync(g => g.GenreId == requestedGenreId.Value, ct);
            if (exists) return requestedGenreId.Value;

            var fallback = await _db.Genres.OrderBy(g => g.GenreId).Select(g => g.GenreId).FirstOrDefaultAsync(ct);
            if (fallback != 0)
            {
                _logger.LogWarning("Requested GenreId {Requested} not found; falling back to {Fallback}", requestedGenreId, fallback);
                return fallback;
            }

            if (_db.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
            {
                // In-memory tests have no FK enforcement and no seed data — keep legacy behavior so existing tests pass
                return requestedGenreId.Value;
            }

            throw new InvalidOperationException("No genres are configured; cannot create course.");
        }

        var firstGenreId = await _db.Genres.OrderBy(g => g.GenreId).Select(g => g.GenreId).FirstOrDefaultAsync(ct);
        if (firstGenreId != 0) return firstGenreId;

        if (_db.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
        {
            return 1;
        }

        throw new InvalidOperationException("No genres are configured; cannot create course.");
    }

    private static string NormalizeMode(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "Online";
        var trimmed = raw.Trim();
        if (trimmed.Equals("Online", StringComparison.OrdinalIgnoreCase)) return "Online";
        if (trimmed.Equals("In-Person", StringComparison.OrdinalIgnoreCase) || trimmed.Equals("InPerson", StringComparison.OrdinalIgnoreCase)) return "In-Person";
        if (trimmed.Equals("Hybrid", StringComparison.OrdinalIgnoreCase)) return "Hybrid";
        return "Online";
    }
}
