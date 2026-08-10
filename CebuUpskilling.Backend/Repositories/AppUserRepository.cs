using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IAppUserRepository : IRepository<AppUser>
{
    Task<AppUser?> GetByIdAsync(int userId);
    Task<AppUser?> GetByEmailAsync(string email);
    Task<bool> ExistsByEmailAsync(string email);
}

public class AppUserRepository : Repository<AppUser>, IAppUserRepository
{
    public AppUserRepository(ApplicationDbContext context) : base(context) { }

    public async Task<AppUser?> GetByIdAsync(int userId) => await _dbSet.FindAsync(userId);

    public async Task<AppUser?> GetByEmailAsync(string email)
        => await _dbSet.FirstOrDefaultAsync(u => u.EmailAddress == email);

    public async Task<bool> ExistsByEmailAsync(string email)
        => await _dbSet.AnyAsync(u => u.EmailAddress == email);
}