using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ILearnerNoteRepository : IEntityRepository<LearnerNote>
{
    Task<LearnerNote?> GetAsync(int learnerId, int lessonId);
    Task<List<LearnerNote>> GetAllForLessonAsync(int learnerId, int lessonId);
    Task<List<LearnerNote>> GetByCourseAsync(int learnerId, int courseId);
}

public class LearnerNoteRepository : EntityRepository<LearnerNote>, ILearnerNoteRepository
{
    public LearnerNoteRepository(ApplicationDbContext context) : base(context) { }

    public override Task<List<LearnerNote>> GetAllAsync()
        => _dbSet.ToListAsync();

    public override async Task<LearnerNote?> GetByIdAsync(int id)
        => await _dbSet.FirstOrDefaultAsync(n => n.LearnerNoteId == id);

    // A learner may hold several notes per lesson, so "the" note means the most
    // recently saved one — without an explicit ordering the database is free to
    // return any of them and a save followed by a read can show stale content.
    public async Task<LearnerNote?> GetAsync(int learnerId, int lessonId)
        => await _dbSet
            .Where(n => n.LearnerId == learnerId && n.LessonId == lessonId)
            .OrderByDescending(n => n.UpdatedAt)
            .ThenByDescending(n => n.LearnerNoteId)
            .FirstOrDefaultAsync();

    public async Task<List<LearnerNote>> GetAllForLessonAsync(int learnerId, int lessonId)
        => await _dbSet
            .Where(n => n.LearnerId == learnerId && n.LessonId == lessonId)
            .OrderByDescending(n => n.UpdatedAt)
            .ThenByDescending(n => n.LearnerNoteId)
            .ToListAsync();

    public async Task<List<LearnerNote>> GetByCourseAsync(int learnerId, int courseId)
        => await _dbSet
            .Include(n => n.Lesson)
            .Where(n => n.LearnerId == learnerId && n.Lesson.CourseId == courseId)
            .OrderBy(n => n.LessonId)
            .ThenBy(n => n.LearnerNoteId)
            .ToListAsync();
}