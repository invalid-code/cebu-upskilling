using CebuUpskilling.Backend.Data;

namespace CebuUpskilling.Backend.Repositories;

public abstract class EntityRepository<T> : Repository<T>, IEntityRepository<T> where T : class
{
    protected EntityRepository(ApplicationDbContext context) : base(context) { }

    public abstract Task<List<T>> GetAllAsync();
    public abstract Task<T?> GetByIdAsync(int id);
}