using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IPostSkillRepository : IRepository<PostSkill>
{
    Task<List<PostSkill>> GetByPostIdAsync(Guid postId);
    Task<List<PostSkill>> GetByPostIdWithSkillAsync(Guid postId);
}

public class PostSkillRepository : Repository<PostSkill>, IPostSkillRepository
{
    public PostSkillRepository(ApplicationDbContext context) : base(context) { }

    public async Task<List<PostSkill>> GetByPostIdAsync(Guid postId)
        => await _dbSet.Where(ps => ps.PostId == postId).ToListAsync();

    public async Task<List<PostSkill>> GetByPostIdWithSkillAsync(Guid postId)
        => await _dbSet.Include(ps => ps.Skill).Where(ps => ps.PostId == postId).ToListAsync();
}