using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IApplicationRepository : IEntityRepository<Application>
{
    Task<List<Application>> GetByLearnerIdAsync(int learnerId);
    Task<Application?> GetByLearnerAndPostAsync(int learnerId, int postId);
    Task<List<Application>> GetByCompanyIdAsync(int companyId);
    Task<Application?> GetByIdWithLearnerAsync(int applicationId);
    Task<Application?> GetByIdWithLearnerAndSkillsAsync(int applicationId);
}

public class ApplicationRepository : EntityRepository<Application>, IApplicationRepository
{
    public ApplicationRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Application>> GetAllAsync()
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .ToListAsync();

    public override async Task<Application?> GetByIdAsync(int id)
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .FirstOrDefaultAsync(a => a.ApplicationId == id);

    public async Task<List<Application>> GetByLearnerIdAsync(int learnerId)
        => await _dbSet
            .Where(a => a.LearnerId == learnerId)
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .ToListAsync();

    public async Task<Application?> GetByLearnerAndPostAsync(int learnerId, int postId)
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .FirstOrDefaultAsync(a => a.LearnerId == learnerId && a.PostId == postId);

    public async Task<List<Application>> GetByCompanyIdAsync(int companyId)
        => await _dbSet
            .Where(a => a.Post.CompanyId == companyId)
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .Include(a => a.Learner).ThenInclude(l => l.User)
            .ToListAsync();

    public async Task<Application?> GetByIdWithLearnerAsync(int applicationId)
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .Include(a => a.Learner).ThenInclude(l => l.User)
            .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

    public async Task<Application?> GetByIdWithLearnerAndSkillsAsync(int applicationId)
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .Include(a => a.Learner).ThenInclude(l => l.User)
            .Include(a => a.Learner).ThenInclude(l => l.LearnerSkills).ThenInclude(ls => ls.Skill)
            .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);
}