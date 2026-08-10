using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ICompanyRepository : IEntityRepository<Company> { }

public class CompanyRepository : EntityRepository<Company>, ICompanyRepository
{
    public CompanyRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Company>> GetAllAsync() => await _dbSet.ToListAsync();

    public override async Task<Company?> GetByIdAsync(int id) => await _dbSet.FindAsync(id);
}