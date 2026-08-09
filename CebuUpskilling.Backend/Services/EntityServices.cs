using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

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
    protected readonly ApplicationDbContext _context;
    protected readonly ILogger _logger;
    protected readonly string _entityName;

    protected BaseEntityService(ApplicationDbContext context, ILogger logger, string entityName)
    {
        _context = context;
        _logger = logger;
        _entityName = entityName;
    }

    public abstract Task<List<T>> GetAllAsync();
    public abstract Task<T?> GetByIdAsync(int id);

    public virtual async Task<T> CreateAsync(T entity)
    {
        _logger.LogInformation("Creating {Entity}", _entityName);
        _context.Add(entity);
        await _context.SaveChangesAsync();
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
        await SaveUpdates(existing, entity);
        await _context.SaveChangesAsync();
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
        _context.Remove(existing);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Deleted {Entity} {Id}", _entityName, id);
        return true;
    }

    protected abstract Task SaveUpdates(T existing, T entity);
}

public class DisciplineService : BaseEntityService<Discipline>
{
    public DisciplineService(ApplicationDbContext context, ILogger<DisciplineService> logger)
        : base(context, logger, "Discipline") { }

    public override async Task<List<Discipline>> GetAllAsync()
    {
        _logger.LogDebug("Fetching all Disciplines");
        return await _context.Disciplines.ToListAsync();
    }

    public override async Task<Discipline?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching Discipline {Id}", id);
        return await _context.Disciplines.FindAsync(id);
    }

    protected override async Task SaveUpdates(Discipline existing, Discipline entity)
    {
        existing.Name = entity.Name;
        existing.Description = entity.Description;
    }
}

public class SubDisciplineService : BaseEntityService<SubDiscipline>
{
    public SubDisciplineService(ApplicationDbContext context, ILogger<SubDisciplineService> logger)
        : base(context, logger, "SubDiscipline") { }

    public override async Task<List<SubDiscipline>> GetAllAsync()
    {
        _logger.LogDebug("Fetching all SubDisciplines");
        return await _context.SubDisciplines.Include(s => s.Discipline).ToListAsync();
    }

    public override async Task<SubDiscipline?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching SubDiscipline {Id}", id);
        return await _context.SubDisciplines.Include(s => s.Discipline).FirstOrDefaultAsync(s => s.SubDisciplineId == id);
    }

    protected override async Task SaveUpdates(SubDiscipline existing, SubDiscipline entity)
    {
        existing.Name = entity.Name;
        existing.Description = entity.Description;
        existing.DisciplineId = entity.DisciplineId;
    }
}

public class GenreService : BaseEntityService<Genre>
{
    public GenreService(ApplicationDbContext context, ILogger<GenreService> logger)
        : base(context, logger, "Genre") { }

    public override async Task<List<Genre>> GetAllAsync()
    {
        _logger.LogDebug("Fetching all Genres");
        return await _context.Genres.Include(g => g.SubDiscipline).ToListAsync();
    }

    public override async Task<Genre?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching Genre {Id}", id);
        return await _context.Genres.Include(g => g.SubDiscipline).FirstOrDefaultAsync(g => g.GenreId == id);
    }

    protected override async Task SaveUpdates(Genre existing, Genre entity)
    {
        existing.Name = entity.Name;
        existing.Description = entity.Description;
        existing.SubDisciplineId = entity.SubDisciplineId;
    }
}

public class CourseService : BaseEntityService<Course>
{
    public CourseService(ApplicationDbContext context, ILogger<CourseService> logger)
        : base(context, logger, "Course") { }

    public override async Task<List<Course>> GetAllAsync()
    {
        _logger.LogDebug("Fetching all Courses");
        return await _context.Courses.Include(c => c.Genre).ToListAsync();
    }

    public override async Task<Course?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching Course {Id}", id);
        return await _context.Courses.Include(c => c.Genre).FirstOrDefaultAsync(c => c.CourseId == id);
    }

    protected override async Task SaveUpdates(Course existing, Course entity)
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
    public LessonService(ApplicationDbContext context, ILogger<LessonService> logger)
        : base(context, logger, "Lesson") { }

    public override async Task<List<Lesson>> GetAllAsync()
    {
        _logger.LogDebug("Fetching all Lessons");
        return await _context.Lessons.Include(l => l.Course).ToListAsync();
    }

    public override async Task<Lesson?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching Lesson {Id}", id);
        return await _context.Lessons.Include(l => l.Course).FirstOrDefaultAsync(l => l.LessonId == id);
    }

    protected override async Task SaveUpdates(Lesson existing, Lesson entity)
    {
        existing.Name = entity.Name;
        existing.Description = entity.Description;
        existing.CourseId = entity.CourseId;
    }
}

public class LessonContentService : BaseEntityService<LessonContent>
{
    public LessonContentService(ApplicationDbContext context, ILogger<LessonContentService> logger)
        : base(context, logger, "LessonContent") { }

    public override async Task<List<LessonContent>> GetAllAsync()
    {
        _logger.LogDebug("Fetching all LessonContents");
        return await _context.LessonContents.Include(lc => lc.Lesson).ToListAsync();
    }

    public override async Task<LessonContent?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching LessonContent {Id}", id);
        return await _context.LessonContents.Include(lc => lc.Lesson).FirstOrDefaultAsync(lc => lc.ContentId == id);
    }

    protected override async Task SaveUpdates(LessonContent existing, LessonContent entity)
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
    public ExerciseService(ApplicationDbContext context, ILogger<ExerciseService> logger)
        : base(context, logger, "Exercise") { }

    public override async Task<List<Exercise>> GetAllAsync()
    {
        _logger.LogDebug("Fetching all Exercises");
        return await _context.Exercises.Include(e => e.Lesson).ToListAsync();
    }

    public override async Task<Exercise?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching Exercise {Id}", id);
        return await _context.Exercises.Include(e => e.Lesson).FirstOrDefaultAsync(e => e.ExerciseId == id);
    }

    protected override async Task SaveUpdates(Exercise existing, Exercise entity)
    {
        existing.Type = entity.Type;
        existing.LessonId = entity.LessonId;
        existing.AnswerKey = entity.AnswerKey;
    }
}

public class CompanyService : BaseEntityService<Company>
{
    public CompanyService(ApplicationDbContext context, ILogger<CompanyService> logger)
        : base(context, logger, "Company") { }

    public override async Task<List<Company>> GetAllAsync()
    {
        _logger.LogDebug("Fetching all Companies");
        return await _context.Companies.ToListAsync();
    }

    public override async Task<Company?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching Company {Id}", id);
        return await _context.Companies.FindAsync(id);
    }

    protected override async Task SaveUpdates(Company existing, Company entity)
    {
        existing.Name = entity.Name;
    }
}

public class PostService : BaseEntityService<Post>
{
    public PostService(ApplicationDbContext context, ILogger<PostService> logger)
        : base(context, logger, "Post") { }

    public override async Task<List<Post>> GetAllAsync()
    {
        _logger.LogDebug("Fetching all Posts");
        return await _context.Posts.Include(p => p.Recruiter).Include(p => p.Company).ToListAsync();
    }

    public override async Task<Post?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching Post {Id}", id);
        return await _context.Posts.Include(p => p.Recruiter).Include(p => p.Company).FirstOrDefaultAsync(p => p.PostId == id);
    }

    protected override async Task SaveUpdates(Post existing, Post entity)
    {
        existing.Title = entity.Title;
        existing.Description = entity.Description;
        existing.RecruiterId = entity.RecruiterId;
        existing.CompanyId = entity.CompanyId;
    }
}

public class LearnerService : BaseEntityService<Learner>
{
    public LearnerService(ApplicationDbContext context, ILogger<LearnerService> logger)
        : base(context, logger, "Learner") { }

    public override async Task<List<Learner>> GetAllAsync()
    {
        _logger.LogDebug("Fetching all Learners");
        return await _context.Learners.Include(l => l.User).ToListAsync();
    }

    public override async Task<Learner?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Fetching Learner {Id}", id);
        return await _context.Learners.Include(l => l.User).FirstOrDefaultAsync(l => l.LearnerId == id);
    }

    public async Task<Learner?> GetByUserIdAsync(int userId)
    {
        _logger.LogDebug("Fetching Learner for user {UserId}", userId);
        return await _context.Learners.Include(l => l.User).FirstOrDefaultAsync(l => l.UserId == userId);
    }

    protected override async Task SaveUpdates(Learner existing, Learner entity)
    {
        existing.IsPremium = entity.IsPremium;
    }
}
