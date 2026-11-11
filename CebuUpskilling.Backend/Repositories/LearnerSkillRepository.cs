using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ILearnerSkillRepository : IRepository<LearnerSkill>
{
    Task<List<LearnerSkill>> GetByLearnerIdWithSkillAsync(Guid learnerId);
    Task<LearnerSkill?> GetByLearnerAndSkillAsync(Guid learnerId, Guid skillId);
}

public class LearnerSkillRepository : Repository<LearnerSkill>, ILearnerSkillRepository
{
    public LearnerSkillRepository(ApplicationDbContext context) : base(context) { }

    public async Task<List<LearnerSkill>> GetByLearnerIdWithSkillAsync(Guid learnerId)
        => await _dbSet.Include(ls => ls.Skill).Where(ls => ls.LearnerId == learnerId).ToListAsync();

    public async Task<LearnerSkill?> GetByLearnerAndSkillAsync(Guid learnerId, Guid skillId)
        => await _dbSet.FirstOrDefaultAsync(ls => ls.LearnerId == learnerId && ls.SkillId == skillId);
}