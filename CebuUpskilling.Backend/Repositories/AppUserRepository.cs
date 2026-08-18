using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IAppUserRepository : IEntityRepository<AppUser>
{
    Task<AppUser?> GetByEmailAsync(string email);
    Task<bool> ExistsByEmailAsync(string email);
    Task<AppUser?> GetByIdWithCompanyAsync(int userId);
    Task<List<string>> GetEmailsByCompanyIdAsync(int companyId);
}

public class AppUserRepository : EntityRepository<AppUser>, IAppUserRepository
{
    public AppUserRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<AppUser>> GetAllAsync()
        => await _dbSet.ToListAsync();

    public override async Task<AppUser?> GetByIdAsync(int userId) => await _dbSet.FindAsync(userId);

    public async Task<AppUser?> GetByEmailAsync(string email)
        => await _dbSet.FirstOrDefaultAsync(u => u.EmailAddress == email);

    public async Task<AppUser?> GetByIdWithCompanyAsync(int userId)
        => await _dbSet.Include(u => u.Company).FirstOrDefaultAsync(u => u.UserId == userId);

    public async Task<bool> ExistsByEmailAsync(string email)
        => await _dbSet.AnyAsync(u => u.EmailAddress == email);

    public async Task<List<string>> GetEmailsByCompanyIdAsync(int companyId)
        => await _dbSet
            .Where(u => u.CompanyId == companyId && !string.IsNullOrWhiteSpace(u.EmailAddress))
            .Select(u => u.EmailAddress)
            .ToListAsync();
}