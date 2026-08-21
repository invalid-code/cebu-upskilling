using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IPostRepository : IEntityRepository<Post>
{
    Task<int> CountAsync();
}

public class PostRepository : EntityRepository<Post>, IPostRepository
{
    public PostRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Post>> GetAllAsync()
        => await _dbSet
            .Include(p => p.Recruiter)
            .Include(p => p.Company)
            .Include(p => p.PostSkills)
                .ThenInclude(ps => ps.Skill)
            .ToListAsync();

    public override async Task<Post?> GetByIdAsync(int id)
        => await _dbSet
            .Include(p => p.Recruiter)
            .Include(p => p.Company)
            .Include(p => p.PostSkills)
                .ThenInclude(ps => ps.Skill)
            .FirstOrDefaultAsync(p => p.PostId == id);

    public async Task<int> CountAsync() => await _dbSet.CountAsync();
}