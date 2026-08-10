using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IExerciseRepository : IEntityRepository<Exercise> { }

public class ExerciseRepository : EntityRepository<Exercise>, IExerciseRepository
{
    public ExerciseRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Exercise>> GetAllAsync()
        => await _dbSet.Include(e => e.Lesson).ToListAsync();

    public override async Task<Exercise?> GetByIdAsync(int id)
        => await _dbSet.Include(e => e.Lesson).FirstOrDefaultAsync(e => e.ExerciseId == id);
}