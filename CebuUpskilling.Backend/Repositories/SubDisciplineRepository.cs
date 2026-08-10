using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ISubDisciplineRepository : IEntityRepository<SubDiscipline> { }

public class SubDisciplineRepository : EntityRepository<SubDiscipline>, ISubDisciplineRepository
{
    public SubDisciplineRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<SubDiscipline>> GetAllAsync()
        => await _dbSet.Include(s => s.Discipline).ToListAsync();

    public override async Task<SubDiscipline?> GetByIdAsync(int id)
        => await _dbSet.Include(s => s.Discipline).FirstOrDefaultAsync(s => s.SubDisciplineId == id);
}