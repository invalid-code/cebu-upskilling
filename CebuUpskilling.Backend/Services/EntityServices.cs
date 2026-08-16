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
    public PostService(IPostRepository repository, ILogger<PostService> logger)
        : base(repository, logger, "Post") { }

    protected override void SaveUpdates(Post existing, Post entity)
    {
        existing.Title = entity.Title;
        existing.Description = entity.Description;
        existing.TargetRole = entity.TargetRole;
        existing.RecruiterId = entity.RecruiterId;
        existing.CompanyId = entity.CompanyId;
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