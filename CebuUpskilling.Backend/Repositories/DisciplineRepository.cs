using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IDisciplineRepository : IEntityRepository<Discipline> { }

public class DisciplineRepository : EntityRepository<Discipline>, IDisciplineRepository
{
    public DisciplineRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Discipline>> GetAllAsync() => await _dbSet.ToListAsync();

    public override async Task<Discipline?> GetByIdAsync(int id) => await _dbSet.FindAsync(id);
}