namespace CebuUpskilling.Backend.Repositories;

public interface IEntityRepository<T> : IRepository<T> where T : class
{
    Task<List<T>> GetAllAsync();
    Task<T?> GetByIdAsync(int id);
}