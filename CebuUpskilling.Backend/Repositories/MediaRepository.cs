using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public class MediaRepository : EntityRepository<Media>, IMediaRepository
{
    public MediaRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Media>> GetAllAsync()
        => await _dbSet.ToListAsync();

    public override async Task<Media?> GetByIdAsync(int id)
        => await _dbSet.FirstOrDefaultAsync(m => m.MediaId == id);
}
