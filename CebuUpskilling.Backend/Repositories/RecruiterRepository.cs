using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IRecruiterRepository : IEntityRepository<Recruiter>
{
    Task<Recruiter?> GetByUserIdAsync(int userId);
}

public class RecruiterRepository : EntityRepository<Recruiter>, IRecruiterRepository
{
    public RecruiterRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Recruiter>> GetAllAsync()
        => await _dbSet.Include(r => r.Company).ToListAsync();

    public override async Task<Recruiter?> GetByIdAsync(int id)
        => await _dbSet.Include(r => r.Company).FirstOrDefaultAsync(r => r.RecruiterId == id);

    public async Task<Recruiter?> GetByUserIdAsync(int userId)
        => await _dbSet.Include(r => r.Company).FirstOrDefaultAsync(r => r.UserId == userId);
}
