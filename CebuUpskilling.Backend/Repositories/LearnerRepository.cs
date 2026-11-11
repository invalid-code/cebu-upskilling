using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ILearnerRepository : IEntityRepository<Learner>
{
    Task<Learner?> GetByUserIdAsync(Guid userId);
}

public class LearnerRepository : EntityRepository<Learner>, ILearnerRepository
{
    public LearnerRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Learner>> GetAllAsync()
        => await _dbSet.Include(l => l.User).ToListAsync();

    public override async Task<Learner?> GetByIdAsync(Guid id)
        => await _dbSet.Include(l => l.User).FirstOrDefaultAsync(l => l.LearnerId == id);

    public async Task<Learner?> GetByUserIdAsync(Guid userId)
        => await _dbSet.Include(l => l.User).FirstOrDefaultAsync(l => l.UserId == userId);
}