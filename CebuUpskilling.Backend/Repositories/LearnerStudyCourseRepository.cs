using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ILearnerStudyCourseRepository : IEntityRepository<LearnerStudyCourse>
{
    Task<List<LearnerStudyCourse>> GetByLearnerIdAsync(Guid learnerId);
    Task<List<LearnerStudyCourse>> GetByLearnerIdWithCourseAsync(Guid learnerId);
    Task<LearnerStudyCourse?> GetByLearnerAndCourseAsync(Guid learnerId, Guid courseId);
    Task<int> CountByLearnerIdAsync(Guid learnerId);
    Task<double> SumProgressByLearnerIdAsync(Guid learnerId);
}

public class LearnerStudyCourseRepository : EntityRepository<LearnerStudyCourse>, ILearnerStudyCourseRepository
{
    public LearnerStudyCourseRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<LearnerStudyCourse>> GetAllAsync()
        => await _dbSet.ToListAsync();

    public override async Task<LearnerStudyCourse?> GetByIdAsync(Guid id)
        => await _dbSet.FirstOrDefaultAsync(lsc => lsc.CourseId == id);

    public async Task<List<LearnerStudyCourse>> GetByLearnerIdAsync(Guid learnerId)
        => await _dbSet.Include(lsc => lsc.Course).Where(lsc => lsc.LearnerId == learnerId).ToListAsync();

    public async Task<List<LearnerStudyCourse>> GetByLearnerIdWithCourseAsync(Guid learnerId)
        => await _dbSet
            .Include(lsc => lsc.Course)
                .ThenInclude(c => c.Genre)
            .Include(lsc => lsc.Course)
                .ThenInclude(c => c.Modules)
            .Where(lsc => lsc.LearnerId == learnerId)
            .ToListAsync();

    public async Task<LearnerStudyCourse?> GetByLearnerAndCourseAsync(Guid learnerId, Guid courseId)
        => await _dbSet.FirstOrDefaultAsync(lsc => lsc.LearnerId == learnerId && lsc.CourseId == courseId);

    public async Task<int> CountByLearnerIdAsync(Guid learnerId)
        => await _dbSet.CountAsync(lsc => lsc.LearnerId == learnerId);

    public async Task<double> SumProgressByLearnerIdAsync(Guid learnerId)
        => await _dbSet.Where(lsc => lsc.LearnerId == learnerId).SumAsync(lsc => lsc.LastTotalProgressPercent * 0.1);
}