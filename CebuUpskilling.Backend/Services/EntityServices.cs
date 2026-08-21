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

public class PostService : BaseEntityService<Post>
{
    private readonly IPostSkillRepository _postSkills;
    private readonly IRoleSkillRepository _roleSkills;

    public PostService(
        IPostRepository repository,
        IPostSkillRepository postSkills,
        IRoleSkillRepository roleSkills,
        ILogger<PostService> logger)
        : base(repository, logger, "Post")
    {
        _postSkills = postSkills;
        _roleSkills = roleSkills;
    }

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
        var postSkills = await _postSkills.GetByPostIdAsync(id);
        foreach (var ps in postSkills)
            _postSkills.Remove(ps);

        await _postSkills.SaveChangesAsync();
        await base.DeleteAsync(id);

        await SyncRoleSkillsForRoleAsync(targetRole);
        return true;
    }

    protected override void SaveUpdates(Post existing, Post entity)
    {
        existing.Title = entity.Title;
        existing.Description = entity.Description;
        existing.TargetRole = string.IsNullOrWhiteSpace(entity.TargetRole) ? entity.Title : entity.TargetRole;
        existing.RecruiterId = entity.RecruiterId;
        existing.CompanyId = entity.CompanyId;
        existing.Schedule = string.IsNullOrWhiteSpace(entity.Schedule) ? "Full-time" : entity.Schedule;
    }

    private async Task SyncPostSkillsAsync(Post post, List<RequiredSkillInput> required)
    {
        var validItems = required
            .Where(r => r.SkillId > 0)
            .GroupBy(r => r.SkillId)
            .Select(g => new RequiredSkillInput(g.Key, g.Max(r => r.RequiredLevel)))
            .ToList();

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

        var all = (await ((IPostRepository)_repository).GetAllAsync())
            .Where(p => string.Equals(p.TargetRole, targetRole, StringComparison.OrdinalIgnoreCase))
            .ToList();

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