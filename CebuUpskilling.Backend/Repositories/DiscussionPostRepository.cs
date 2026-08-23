using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IDiscussionPostRepository : IEntityRepository<DiscussionPost>
{
    Task<List<DiscussionPost>> GetByLessonAsync(int lessonId);
}

public class DiscussionPostRepository : EntityRepository<DiscussionPost>, IDiscussionPostRepository
{
    public DiscussionPostRepository(ApplicationDbContext context) : base(context) { }

    public override Task<List<DiscussionPost>> GetAllAsync()
        => _dbSet.ToListAsync();

    public override async Task<DiscussionPost?> GetByIdAsync(int id)
        => await _dbSet.FirstOrDefaultAsync(p => p.DiscussionPostId == id);

    public async Task<List<DiscussionPost>> GetByLessonAsync(int lessonId)
        => await _dbSet
            .Where(p => p.LessonId == lessonId)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();
}