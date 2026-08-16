using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ISkillRepository : IRepository<Skill>
{
    Task<Skill?> GetByIdAsync(int skillId);
    Task<List<Skill>> GetByNamesAsync(IEnumerable<string> names);
}

public class SkillRepository : Repository<Skill>, ISkillRepository
{
    public SkillRepository(ApplicationDbContext context) : base(context) { }

    public async Task<Skill?> GetByIdAsync(int skillId) => await _dbSet.FindAsync(skillId);

    public async Task<List<Skill>> GetByNamesAsync(IEnumerable<string> names)
        => await _dbSet.Where(s => names.Contains(s.Name)).ToListAsync();
}