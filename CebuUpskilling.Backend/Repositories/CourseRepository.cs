using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface ICourseRepository : IEntityRepository<Course> { }

public class CourseRepository : EntityRepository<Course>, ICourseRepository
{
    public CourseRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Course>> GetAllAsync()
        => await _dbSet.Include(c => c.Genre).ToListAsync();

    public override async Task<Course?> GetByIdAsync(int id)
        => await _dbSet.Include(c => c.Genre).FirstOrDefaultAsync(c => c.CourseId == id);
}