using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IApplicationRepository : IEntityRepository<Application>
{
    Task<List<Application>> GetByLearnerIdAsync(int learnerId);
    Task<Application?> GetByLearnerAndPostAsync(int learnerId, int postId);
}

public class ApplicationRepository : EntityRepository<Application>, IApplicationRepository
{
    public ApplicationRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Application>> GetAllAsync()
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .ToListAsync();

    public override async Task<Application?> GetByIdAsync(int id)
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .FirstOrDefaultAsync(a => a.ApplicationId == id);

    public async Task<List<Application>> GetByLearnerIdAsync(int learnerId)
        => await _dbSet
            .Where(a => a.LearnerId == learnerId)
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .ToListAsync();

    public async Task<Application?> GetByLearnerAndPostAsync(int learnerId, int postId)
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .FirstOrDefaultAsync(a => a.LearnerId == learnerId && a.PostId == postId);
}
