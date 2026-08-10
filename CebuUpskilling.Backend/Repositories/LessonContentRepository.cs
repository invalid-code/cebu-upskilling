using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ILessonContentRepository : IEntityRepository<LessonContent> { }

public class LessonContentRepository : EntityRepository<LessonContent>, ILessonContentRepository
{
    public LessonContentRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<LessonContent>> GetAllAsync()
        => await _dbSet.Include(lc => lc.Lesson).ToListAsync();

    public override async Task<LessonContent?> GetByIdAsync(int id)
        => await _dbSet.Include(lc => lc.Lesson).FirstOrDefaultAsync(lc => lc.ContentId == id);
}