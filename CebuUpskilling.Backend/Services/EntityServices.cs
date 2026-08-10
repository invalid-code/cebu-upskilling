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

public class DisciplineService : BaseEntityService<Discipline>
{
    public DisciplineService(IDisciplineRepository repository, ILogger<DisciplineService> logger)
        : base(repository, logger, "Discipline") { }

    protected override void SaveUpdates(Discipline existing, Discipline entity)
    {
        existing.Name = entity.Name;
        existing.Description = entity.Description;
    }
}

public class SubDisciplineService : BaseEntityService<SubDiscipline>
{
    public SubDisciplineService(ISubDisciplineRepository repository, ILogger<SubDisciplineService> logger)
        : base(repository, logger, "SubDiscipline") { }

    protected override void SaveUpdates(SubDiscipline existing, SubDiscipline entity)
    {
        existing.Name = entity.Name;
        existing.Description = entity.Description;
        existing.DisciplineId = entity.DisciplineId;
    }
}

public class GenreService : BaseEntityService<Genre>
{
    public GenreService(IGenreRepository repository, ILogger<GenreService> logger)
        : base(repository, logger, "Genre") { }

    protected override void SaveUpdates(Genre existing, Genre entity)
    {
        existing.Name = entity.Name;
        existing.Description = entity.Description;
        existing.SubDisciplineId = entity.SubDisciplineId;
    }
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

public class LessonService : BaseEntityService<Lesson>
{
    public LessonService(ILessonRepository repository, ILogger<LessonService> logger)
        : base(repository, logger, "Lesson") { }

    protected override void SaveUpdates(Lesson existing, Lesson entity)
    {
        existing.Name = entity.Name;
        existing.Description = entity.Description;
        existing.CourseId = entity.CourseId;
    }
}

public class LessonContentService : BaseEntityService<LessonContent>
{
    public LessonContentService(ILessonContentRepository repository, ILogger<LessonContentService> logger)
        : base(repository, logger, "LessonContent") { }

    protected override void SaveUpdates(LessonContent existing, LessonContent entity)
    {
        existing.BlockType = entity.BlockType;
        existing.Content = entity.Content;
        existing.LessonOrder = entity.LessonOrder;
        existing.TopicOrder = entity.TopicOrder;
        existing.PercentAddedPerContent = entity.PercentAddedPerContent;
    }
}

public class ExerciseService : BaseEntityService<Exercise>
{
    public ExerciseService(IExerciseRepository repository, ILogger<ExerciseService> logger)
        : base(repository, logger, "Exercise") { }

    protected override void SaveUpdates(Exercise existing, Exercise entity)
    {
        existing.Type = entity.Type;
        existing.LessonId = entity.LessonId;
        existing.AnswerKey = entity.AnswerKey;
    }
}

public class CompanyService : BaseEntityService<Company>
{
    public CompanyService(ICompanyRepository repository, ILogger<CompanyService> logger)
        : base(repository, logger, "Company") { }

    protected override void SaveUpdates(Company existing, Company entity)
    {
        existing.Name = entity.Name;
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
        existing.RecruiterId = entity.RecruiterId;
        existing.CompanyId = entity.CompanyId;
    }
}

public class LearnerService : BaseEntityService<Learner>
{
    private readonly ILearnerRepository _learnerRepository;

    public LearnerService(ILearnerRepository repository, ILogger<LearnerService> logger)
        : base(repository, logger, "Learner")
    {
        _learnerRepository = repository;
    }

    public Task<Learner?> GetByUserIdAsync(int userId) => _learnerRepository.GetByUserIdAsync(userId);

    protected override void SaveUpdates(Learner existing, Learner entity)
    {
        existing.IsPremium = entity.IsPremium;
    }
}