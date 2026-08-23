using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ILearnerNoteRepository : IEntityRepository<LearnerNote>
{
    Task<LearnerNote?> GetAsync(int learnerId, int lessonId);
    Task<List<LearnerNote>> GetByCourseAsync(int learnerId, int courseId);
}

public class LearnerNoteRepository : EntityRepository<LearnerNote>, ILearnerNoteRepository
{
    public LearnerNoteRepository(ApplicationDbContext context) : base(context) { }

    public override Task<List<LearnerNote>> GetAllAsync()
        => _dbSet.ToListAsync();

    public override async Task<LearnerNote?> GetByIdAsync(int id)
        => await _dbSet.FirstOrDefaultAsync(n => n.LearnerNoteId == id);

    public async Task<LearnerNote?> GetAsync(int learnerId, int lessonId)
        => await _dbSet
            .FirstOrDefaultAsync(n => n.LearnerId == learnerId && n.LessonId == lessonId);

    public async Task<List<LearnerNote>> GetByCourseAsync(int learnerId, int courseId)
        => await _dbSet
            .Include(n => n.Lesson)
            .Where(n => n.LearnerId == learnerId && n.Lesson.CourseId == courseId)
            .OrderBy(n => n.LessonId)
            .ToListAsync();
}