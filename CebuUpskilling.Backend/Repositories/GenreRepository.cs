using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IGenreRepository : IEntityRepository<Genre> { }

public class GenreRepository : EntityRepository<Genre>, IGenreRepository
{
    public GenreRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Genre>> GetAllAsync()
        => await _dbSet.Include(g => g.SubDiscipline).ToListAsync();

    public override async Task<Genre?> GetByIdAsync(int id)
        => await _dbSet.Include(g => g.SubDiscipline).FirstOrDefaultAsync(g => g.GenreId == id);
}