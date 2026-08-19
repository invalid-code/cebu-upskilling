using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ICourseRepository : IEntityRepository<Course>
{
    Task<List<Course>> GetAllWithLessonsAsync();
    Task<Dictionary<int, int>> GetLessonCountsByCourseIdsAsync(List<int> courseIds);
    Task<Course?> GetWithLessonsAsync(int courseId);
    Task<Course?> GetWithModulesAsync(int courseId);
}

public class CourseRepository : EntityRepository<Course>, ICourseRepository
{
    public CourseRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Course>> GetAllAsync()
        => await _dbSet.Include(c => c.Genre).ToListAsync();

    public override async Task<Course?> GetByIdAsync(int id)
        => await _dbSet.Include(c => c.Genre).FirstOrDefaultAsync(c => c.CourseId == id);

    public async Task<List<Course>> GetAllWithLessonsAsync()
        => await _dbSet
            .Include(c => c.Genre)
                .ThenInclude(g => g.SubDiscipline)
            .Include(c => c.Lessons)
            .ToListAsync();

    public async Task<Dictionary<int, int>> GetLessonCountsByCourseIdsAsync(List<int> courseIds)
        => await _dbSet
            .Where(c => courseIds.Contains(c.CourseId))
            .Include(c => c.Lessons)
            .ToDictionaryAsync(c => c.CourseId, c => c.Lessons.Count);

    public async Task<Course?> GetWithLessonsAsync(int courseId)
        => await _dbSet
            .Include(c => c.Genre)
                .ThenInclude(g => g.SubDiscipline)
            .Include(c => c.Lessons)
            .FirstOrDefaultAsync(c => c.CourseId == courseId);

    public async Task<Course?> GetWithModulesAsync(int courseId)
        => await _dbSet
            .Include(c => c.Genre)
                .ThenInclude(g => g.SubDiscipline)
            .Include(c => c.Modules.OrderBy(m => m.Order))
                .ThenInclude(m => m.Lessons.OrderBy(l => l.LessonId))
            .FirstOrDefaultAsync(c => c.CourseId == courseId);
}