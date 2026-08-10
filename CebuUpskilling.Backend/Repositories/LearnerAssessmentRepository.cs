using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ILearnerAssessmentRepository : IRepository<LearnerAssessment>
{
    Task<List<LearnerAssessment>> GetVerifiedByLearnerIdAsync(int learnerId);
    Task<List<LearnerAssessment>> GetByLearnerIdAsync(int learnerId);
    Task<LearnerAssessment?> GetByIdForLearnerAsync(int assessmentId, int learnerId);
}

public class LearnerAssessmentRepository : Repository<LearnerAssessment>, ILearnerAssessmentRepository
{
    public LearnerAssessmentRepository(ApplicationDbContext context) : base(context) { }

    public async Task<List<LearnerAssessment>> GetVerifiedByLearnerIdAsync(int learnerId)
        => await _dbSet
            .Include(a => a.Skill)
            .Where(a => a.LearnerId == learnerId && a.Verified)
            .OrderByDescending(a => a.CompletedAt)
            .ToListAsync();

    public async Task<List<LearnerAssessment>> GetByLearnerIdAsync(int learnerId)
        => await _dbSet
            .Include(a => a.Skill)
            .Where(a => a.LearnerId == learnerId)
            .OrderByDescending(a => a.CompletedAt)
            .ToListAsync();

    public async Task<LearnerAssessment?> GetByIdForLearnerAsync(int assessmentId, int learnerId)
        => await _dbSet
            .Include(a => a.Skill)
            .FirstOrDefaultAsync(a => a.LearnerAssessmentId == assessmentId && a.LearnerId == learnerId);
}