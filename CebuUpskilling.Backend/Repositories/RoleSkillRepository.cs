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

    public async Task<List<RoleSkill>> GetByTargetRoleAsync(string targetRole)
        => await _dbSet.Where(rs => rs.TargetRole == targetRole).ToListAsync();

    public async Task<List<RoleSkill>> GetByTargetRoleWithSkillAsync(string targetRole)
        => await _dbSet.Include(rs => rs.Skill).Where(rs => rs.TargetRole == targetRole).ToListAsync();
}