using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ILessonRepository : IEntityRepository<Lesson>
{
    Task<Lesson?> GetWithContentAsync(int lessonId);
    Task<List<Lesson>> GetByCourseIdAsync(int courseId);
    Task<List<Lesson>> GetByCourseIdWithContentAsync(int courseId);
}

public class LessonRepository : EntityRepository<Lesson>, ILessonRepository
{
    public LessonRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Lesson>> GetAllAsync()
        => await _dbSet.Include(l => l.Course).ToListAsync();

    public override async Task<Lesson?> GetByIdAsync(int id)
        => await _dbSet.Include(l => l.Course).FirstOrDefaultAsync(l => l.LessonId == id);

    public async Task<Lesson?> GetWithContentAsync(int lessonId)
        => await _dbSet
            .Include(l => l.Course)
            .Include(l => l.LessonContents.OrderBy(lc => lc.LessonOrder).ThenBy(lc => lc.TopicOrder))
            .Include(l => l.Media)
            .Include(l => l.Exercises)
                .ThenInclude(e => e.ExerciseContent)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

    public async Task<List<Lesson>> GetByCourseIdAsync(int courseId)
        => await _dbSet
            .Where(l => l.CourseId == courseId)
            .OrderBy(l => l.LessonId)
            .ToListAsync();

    public async Task<List<Lesson>> GetByCourseIdWithContentAsync(int courseId)
        => await _dbSet
            .Include(l => l.LessonContents.OrderBy(lc => lc.LessonOrder).ThenBy(lc => lc.TopicOrder))
            .Include(l => l.Media)
            .Include(l => l.Exercises)
                .ThenInclude(e => e.ExerciseContent)
            .Where(l => l.CourseId == courseId)
            .OrderBy(l => l.LessonId)
            .ToListAsync();
}