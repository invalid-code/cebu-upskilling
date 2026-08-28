using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;

namespace CebuUpskilling.Backend.Services;

public interface IEntityService<T> where T : class
{
    Task<List<T>> GetAllAsync();
    Task<T?> GetByIdAsync(int id);
    Task<T> CreateAsync(T entity);
    Task<T?> UpdateAsync(int id, T entity);
    Task<bool> DeleteAsync(int id);
}

public abstract class BaseEntityService<T> : IEntityService<T> where T : class
{
    protected readonly IEntityRepository<T> _repository;
    protected readonly ILogger _logger;
    protected readonly string _entityName;

    protected BaseEntityService(IEntityRepository<T> repository, ILogger logger, string entityName)
    {
        _repository = repository;
        _logger = logger;
        _entityName = entityName;
    }

    public virtual async Task<List<T>> GetAllAsync()
    {
        _logger.LogDebug("Fetching all {Entity}", _entityName);
        return await _repository.GetAllAsync();
    }

    public virtual async Task<T?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching {Entity} {Id}", _entityName, id);
        return await _repository.GetByIdAsync(id);
    }

    public virtual async Task<T> CreateAsync(T entity)
    {
        _logger.LogInformation("Creating {Entity}", _entityName);
        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();
        _logger.LogInformation("Created {Entity}", _entityName);
        return entity;
    }

    public virtual async Task<T?> UpdateAsync(int id, T entity)
    {
        _logger.LogInformation("Updating {Entity} {Id}", _entityName, id);
        var existing = await GetByIdAsync(id);
        if (existing == null)
        {
            _logger.LogWarning("Update failed: {Entity} {Id} not found", _entityName, id);
            return null;
        }
        SaveUpdates(existing, entity);
        await _repository.SaveChangesAsync();
        _logger.LogInformation("Updated {Entity} {Id}", _entityName, id);
        return existing;
    }

    public virtual async Task<bool> DeleteAsync(int id)
    {
        _logger.LogInformation("Deleting {Entity} {Id}", _entityName, id);
        var existing = await GetByIdAsync(id);
        if (existing == null)
        {
            _logger.LogWarning("Delete failed: {Entity} {Id} not found", _entityName, id);
            return false;
        }
        _repository.Remove(existing);
        await _repository.SaveChangesAsync();
        _logger.LogInformation("Deleted {Entity} {Id}", _entityName, id);
        return true;
    }

    protected abstract void SaveUpdates(T existing, T entity);
}

public class CourseService : BaseEntityService<Course>
{
    public CourseService(ICourseRepository repository, ILogger<CourseService> logger)
        : base(repository, logger, "Course") { }

    protected override void SaveUpdates(Course existing, Course entity)
    {
        existing.Name = entity.Name;
        existing.Description = entity.Description;
        existing.GenreId = entity.GenreId;
        existing.TechnicalLevel = entity.TechnicalLevel;
        existing.Price = entity.Price;
        existing.Mode = entity.Mode;
    }
}

public interface IPostService
{
    Task<PagedPostsResponse> SearchAsync(PostQueryParams query);
    Task<PostResponse?> GetByIdAsync(int id);
    Task<PostResponse> CreateAsync(PostRequest request, int companyId);
    Task<PostResponse?> UpdateAsync(int id, PostRequest request);
    Task<bool> DeleteAsync(int id);
}

public class PostService : BaseEntityService<Post>, IPostService
{
    private readonly IPostRepository _postRepository;
    private readonly IPostSkillRepository _postSkills;
    private readonly IRoleSkillRepository _roleSkills;
    private readonly ISkillRepository _skills;

    public PostService(
        IPostRepository repository,
        IPostSkillRepository postSkills,
        IRoleSkillRepository roleSkills,
        ISkillRepository skills,
        ILogger<PostService> logger)
        : base(repository, logger, "Post")
    {
        _postRepository = repository;
        _postSkills = postSkills;
        _roleSkills = roleSkills;
        _skills = skills;
    }

    private static string NormalizeSchedule(string? schedule) => schedule switch
    {
        "Part-time" => "Part-time",
        "Side-hustle" => "Side-hustle",
        "Full-time" => "Full-time",
        _ => "Full-time",
    };

    public override async Task<Post> CreateAsync(Post entity)
    {
        if (string.IsNullOrWhiteSpace(entity.TargetRole))
            entity.TargetRole = entity.Title;

        await base.CreateAsync(entity);

        if (entity.RequiredSkills is { Count: > 0 } required)
        {
            await SyncPostSkillsAsync(entity, required);
            await SyncRoleSkillsForRoleAsync(entity.TargetRole);
        }

        return entity;
    }

    public override async Task<Post?> UpdateAsync(int id, Post entity)
    {
        if (string.IsNullOrWhiteSpace(entity.TargetRole))
            entity.TargetRole = entity.Title;

        var updated = await base.UpdateAsync(id, entity);
        if (updated == null) return null;

        if (entity.RequiredSkills != null)
        {
            await SyncPostSkillsAsync(updated, entity.RequiredSkills);
            await SyncRoleSkillsForRoleAsync(updated.TargetRole);
        }

        return updated;
    }

    public override async Task<bool> DeleteAsync(int id)
    {
        var existing = await GetByIdAsync(id);
        if (existing == null) return false;

        var targetRole = existing.TargetRole;

        // Atomic: remove PostSkills and Post in single SaveChanges where possible.
        // IPostSkillRepository and Post share the same DbContext; we defer SaveChanges until after both removals.
        var postSkills = await _postSkills.GetByPostIdAsync(id);
        foreach (var ps in postSkills)
            _postSkills.Remove(ps);

        var postEntity = await _repository.GetByIdAsync(id);
        if (postEntity != null)
            _repository.Remove(postEntity);

        // Single SaveChanges is atomic for this DbContext (PostSkills + Post share context)
        await _repository.SaveChangesAsync();

        await SyncRoleSkillsForRoleAsync(targetRole);
        return true;
    }

    protected override void SaveUpdates(Post existing, Post entity)
    {
        existing.Title = entity.Title;
        existing.Description = entity.Description;
        existing.TargetRole = string.IsNullOrWhiteSpace(entity.TargetRole) ? entity.Title : entity.TargetRole;
        existing.CompanyId = entity.CompanyId;
        existing.Schedule = string.IsNullOrWhiteSpace(entity.Schedule) ? "Full-time" : entity.Schedule;
        existing.Location = entity.Location;
        existing.SalaryRange = entity.SalaryRange;
        existing.JobType = string.IsNullOrWhiteSpace(entity.JobType) ? "Full-time" : entity.JobType;
        existing.ExperienceLevel = entity.ExperienceLevel;
        existing.Requirements = entity.Requirements;
        existing.Benefits = entity.Benefits;
        existing.IsRemote = entity.IsRemote;
        existing.ExpiresAt = entity.ExpiresAt;
        existing.IsActive = entity.IsActive;
        existing.CompanyLogoUrl = entity.CompanyLogoUrl;
    }

    private async Task SyncPostSkillsAsync(Post post, List<RequiredSkillInput> required)
    {
        var validItems = required
            .Where(r => r.SkillId > 0 && r.RequiredLevel >= 1 && r.RequiredLevel <= 5)
            .GroupBy(r => r.SkillId)
            .Select(g => new RequiredSkillInput(g.Key, g.Max(r => r.RequiredLevel)))
            .ToList();

        if (validItems.Count == 0) return;

        // Validate SkillId existence to avoid FK violation 500; silently drop unknown ids.
        var skillIds = validItems.Select(r => r.SkillId).Distinct().ToList();
        var existingSkillIds = (await _skills.GetByIdsAsync(skillIds)).Select(s => s.SkillId).ToHashSet();
        validItems = validItems.Where(r => existingSkillIds.Contains(r.SkillId)).ToList();
        if (validItems.Count == 0) return;

        var existingById = (await _postSkills.GetByPostIdAsync(post.PostId)).ToDictionary(ps => ps.SkillId);
        var requestedIds = validItems.Select(r => r.SkillId).ToHashSet();

        foreach (var existing in existingById.Values)
        {
            if (!requestedIds.Contains(existing.SkillId))
                _postSkills.Remove(existing);
        }

        foreach (var item in validItems)
        {
            if (existingById.TryGetValue(item.SkillId, out var existing))
            {
                existing.RequiredLevel = item.RequiredLevel;
            }
            else
            {
                await _postSkills.AddAsync(new PostSkill
                {
                    PostId = post.PostId,
                    SkillId = item.SkillId,
                    RequiredLevel = item.RequiredLevel,
                });
            }
        }

        await _postSkills.SaveChangesAsync();
    }

    private async Task SyncRoleSkillsForRoleAsync(string targetRole)
    {
        if (string.IsNullOrWhiteSpace(targetRole)) return;

        var all = await _postRepository.GetByTargetRoleAsync(targetRole);

        var requiredBySkill = new Dictionary<int, int>();
        foreach (var post in all)
        {
            foreach (var ps in post.PostSkills ?? new List<PostSkill>())
            {
                requiredBySkill[ps.SkillId] = Math.Max(
                    requiredBySkill.GetValueOrDefault(ps.SkillId),
                    ps.RequiredLevel);
            }
        }

        var existingRoles = await _roleSkills.GetByTargetRoleWithSkillAsync(targetRole);
        var existingBySkill = existingRoles.ToDictionary(rs => rs.SkillId);

        foreach (var kvp in requiredBySkill)
        {
            if (existingBySkill.TryGetValue(kvp.Key, out var existing))
            {
                if (existing.RequiredLevel != kvp.Value)
                    existing.RequiredLevel = kvp.Value;
            }
            else
            {
                await _roleSkills.AddAsync(new RoleSkill { TargetRole = targetRole, SkillId = kvp.Key, RequiredLevel = kvp.Value });
            }
        }

        foreach (var existing in existingRoles)
        {
            if (!requiredBySkill.ContainsKey(existing.SkillId))
                _roleSkills.Remove(existing);
        }

        await _roleSkills.SaveChangesAsync();
    }

    public async Task<PagedPostsResponse> SearchAsync(PostQueryParams query)
    {
        _logger.LogDebug("Searching posts with query {@Query}", query);
        var (items, total) = await _postRepository.SearchAsync(query);
        return new PagedPostsResponse(
            items.Select(ToResponse).ToList(),
            total,
            Math.Max(1, query.Page),
            Math.Clamp(query.PageSize, 1, 100));
    }

    public async Task<PostResponse?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching post {PostId}", id);
        var post = await _repository.GetByIdAsync(id);
        return post == null ? null : ToResponse(post);
    }

    public async Task<PostResponse> CreateAsync(PostRequest request, int companyId)
    {
        _logger.LogInformation("Creating post for company {CompanyId}", companyId);
        var post = new Post
        {
            CompanyId = companyId,
            Title = request.Title ?? string.Empty,
            Description = request.Description,
            TargetRole = string.IsNullOrWhiteSpace(request.TargetRole) ? (request.Title ?? string.Empty) : request.TargetRole!,
            Location = request.Location,
            SalaryRange = request.SalaryRange,
            JobType = string.IsNullOrWhiteSpace(request.JobType) ? "Full-time" : request.JobType!,
            ExperienceLevel = request.ExperienceLevel,
            Requirements = request.Requirements,
            Benefits = request.Benefits,
            IsRemote = request.IsRemote,
            ExpiresAt = request.ExpiresAt,
            IsActive = request.IsActive,
            CompanyLogoUrl = request.CompanyLogoUrl,
            Schedule = NormalizeSchedule(request.Schedule),
            CreatedAt = DateTime.UtcNow,
        };

        await _repository.AddAsync(post);
        await _repository.SaveChangesAsync();

        if (request.RequiredSkills is { Count: > 0 })
        {
            await SyncPostSkillsAsync(post, request.RequiredSkills);
            await SyncRoleSkillsForRoleAsync(post.TargetRole);
        }

        _logger.LogInformation("Created post {PostId} for company {CompanyId}", post.PostId, companyId);

        var created = await _repository.GetByIdAsync(post.PostId);
        return ToResponse(created!);
    }

    public async Task<PostResponse?> UpdateAsync(int id, PostRequest request)
    {
        _logger.LogInformation("Updating post {PostId}", id);
        var existing = await _repository.GetByIdAsync(id);
        if (existing == null)
        {
            _logger.LogWarning("Update failed: post {PostId} not found", id);
            return null;
        }

        var oldTargetRole = existing.TargetRole;
        existing.Title = request.Title ?? existing.Title;
        existing.Description = request.Description;
        existing.TargetRole = string.IsNullOrWhiteSpace(request.TargetRole)
            ? (request.Title ?? existing.Title)
            : request.TargetRole!;
        existing.Location = request.Location;
        existing.SalaryRange = request.SalaryRange;
        existing.JobType = string.IsNullOrWhiteSpace(request.JobType) ? "Full-time" : request.JobType!;
        existing.ExperienceLevel = request.ExperienceLevel;
        existing.Requirements = request.Requirements;
        existing.Benefits = request.Benefits;
        existing.IsRemote = request.IsRemote;
        existing.ExpiresAt = request.ExpiresAt;
        existing.IsActive = request.IsActive;
        existing.CompanyLogoUrl = request.CompanyLogoUrl;
        if (!string.IsNullOrWhiteSpace(request.Schedule))
            existing.Schedule = NormalizeSchedule(request.Schedule);

        await _repository.SaveChangesAsync();

        if (request.RequiredSkills != null)
        {
            await SyncPostSkillsAsync(existing, request.RequiredSkills);
            await SyncRoleSkillsForRoleAsync(existing.TargetRole);
            if (!string.Equals(oldTargetRole, existing.TargetRole, StringComparison.OrdinalIgnoreCase))
                await SyncRoleSkillsForRoleAsync(oldTargetRole);
        }
        _logger.LogInformation("Updated post {PostId}", id);

        var updated = await _repository.GetByIdAsync(id);
        return ToResponse(updated!);
    }

    private static PostResponse ToResponse(Post post)
        => new(
            post.PostId,
            post.CompanyId,
            post.Company?.Name ?? "Unknown",
            post.Title,
            post.Description,
            post.TargetRole,
            post.Location,
            post.SalaryRange,
            post.JobType,
            post.ExperienceLevel,
            post.Requirements,
            post.Benefits,
            post.IsRemote,
            post.ExpiresAt,
            post.IsActive,
            post.CompanyLogoUrl,
            post.CreatedAt,
            post.Schedule ?? "Full-time",
            post.PostSkills?.Select(ps => new RequiredSkillDto(ps.SkillId, ps.Skill?.Name ?? string.Empty, ps.Skill?.Category, ps.RequiredLevel)).ToList() ?? new List<RequiredSkillDto>());
}

public class AppUserService : BaseEntityService<AppUser>
{
    public AppUserService(IAppUserRepository repository, ILogger<AppUserService> logger)
        : base(repository, logger, "AppUser") { }

    protected override void SaveUpdates(AppUser existing, AppUser entity)
    {
        existing.FirstName = entity.FirstName;
        existing.LastName = entity.LastName;
        existing.MiddleName = entity.MiddleName;
        existing.Birthday = entity.Birthday;
        existing.EmailAddress = entity.EmailAddress;
        existing.Role = entity.Role;
        existing.TargetRole = entity.TargetRole;
        existing.Address = entity.Address;
        existing.RemoteFriendly = entity.RemoteFriendly;
    }
}

public class LearnerAssessmentService : BaseEntityService<LearnerAssessment>
{
    public LearnerAssessmentService(ILearnerAssessmentRepository repository, ILogger<LearnerAssessmentService> logger)
        : base(repository, logger, "LearnerAssessment") { }

    protected override void SaveUpdates(LearnerAssessment existing, LearnerAssessment entity)
    {
        existing.LearnerId = entity.LearnerId;
        existing.SkillId = entity.SkillId;
        existing.ScoredLevel = entity.ScoredLevel;
        existing.Verified = entity.Verified;
        existing.CompletedAt = entity.CompletedAt;
    }
}

public class LearnerStudyCourseService : BaseEntityService<LearnerStudyCourse>
{
    public LearnerStudyCourseService(ILearnerStudyCourseRepository repository, ILogger<LearnerStudyCourseService> logger)
        : base(repository, logger, "LearnerStudyCourse") { }

    protected override void SaveUpdates(LearnerStudyCourse existing, LearnerStudyCourse entity)
    {
        existing.LearnerId = entity.LearnerId;
        existing.CourseId = entity.CourseId;
        existing.Started = entity.Started;
        existing.LastTotalProgressPercent = entity.LastTotalProgressPercent;
        existing.LastOnline = entity.LastOnline;
    }
}