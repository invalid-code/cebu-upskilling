using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ISkillRepository : IRepository<Skill>
{
    Task<Skill?> GetByIdAsync(int skillId);
    Task<List<Skill>> GetByNamesAsync(IEnumerable<string> names);
    Task<List<Skill>> ListAllAsync();
}

public class SkillRepository : Repository<Skill>, ISkillRepository
{
    public SkillRepository(ApplicationDbContext context) : base(context) { }

    public async Task<Skill?> GetByIdAsync(int skillId) => await _dbSet.FindAsync(skillId);

    public async Task<List<Skill>> GetByNamesAsync(IEnumerable<string> names)
    {
        var normalized = names
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Select(n => n.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return await _dbSet.Where(s => normalized.Contains(s.Name)).ToListAsync();
    }

    public async Task<List<Skill>> ListAllAsync()
        => await _dbSet.OrderBy(s => s.Name).ToListAsync();
}
