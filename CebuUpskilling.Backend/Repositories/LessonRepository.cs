using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ILessonRepository : IEntityRepository<Lesson> { }

public class LessonRepository : EntityRepository<Lesson>, ILessonRepository
{
    public LessonRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Lesson>> GetAllAsync()
        => await _dbSet.Include(l => l.Course).ToListAsync();

    public override async Task<Lesson?> GetByIdAsync(int id)
        => await _dbSet.Include(l => l.Course).FirstOrDefaultAsync(l => l.LessonId == id);
}