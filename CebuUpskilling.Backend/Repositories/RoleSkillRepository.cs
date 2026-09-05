using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IRoleSkillRepository : IRepository<RoleSkill>
{
    Task<List<RoleSkill>> GetByTargetRoleAsync(string targetRole);
    Task<List<RoleSkill>> GetByTargetRoleWithSkillAsync(string targetRole);
}

public class RoleSkillRepository : Repository<RoleSkill>, IRoleSkillRepository
{
    public RoleSkillRepository(ApplicationDbContext context) : base(context) { }

    // Target-role matching is case-insensitive: roles arrive as free text
    // (job forms, learner profiles) with unpredictable casing, while seeded
    // values use title case. ToLower translates on Npgsql and InMemory alike.
    public async Task<List<RoleSkill>> GetByTargetRoleAsync(string targetRole)
        => await _dbSet.Where(rs => rs.TargetRole.ToLower() == targetRole.ToLower()).ToListAsync();

    public async Task<List<RoleSkill>> GetByTargetRoleWithSkillAsync(string targetRole)
        => await _dbSet.Include(rs => rs.Skill).Where(rs => rs.TargetRole.ToLower() == targetRole.ToLower()).ToListAsync();
}