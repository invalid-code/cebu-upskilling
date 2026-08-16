using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IAppUserRepository : IEntityRepository<AppUser>
{
    Task<AppUser?> GetByEmailAsync(string email);
    Task<bool> ExistsByEmailAsync(string email);
}

public class AppUserRepository : EntityRepository<AppUser>, IAppUserRepository
{
    public AppUserRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<AppUser>> GetAllAsync()
        => await _dbSet.ToListAsync();

    public override async Task<AppUser?> GetByIdAsync(int userId) => await _dbSet.FindAsync(userId);

    public async Task<AppUser?> GetByEmailAsync(string email)
        => await _dbSet.FirstOrDefaultAsync(u => u.EmailAddress == email);

    public async Task<bool> ExistsByEmailAsync(string email)
        => await _dbSet.AnyAsync(u => u.EmailAddress == email);
}