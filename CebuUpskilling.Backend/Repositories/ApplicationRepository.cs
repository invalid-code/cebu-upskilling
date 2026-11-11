using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IApplicationRepository : IEntityRepository<Application>
{
    Task<List<Application>> GetByLearnerIdAsync(Guid learnerId);
    Task<Application?> GetByLearnerAndPostAsync(Guid learnerId, Guid postId);
    Task<List<Application>> GetByCompanyIdAsync(Guid companyId);
    Task<Application?> GetByIdWithLearnerAsync(Guid applicationId);
    Task<Application?> GetByIdWithLearnerAndSkillsAsync(Guid applicationId);
    Task<List<Application>> GetByPostIdWithLearnerAndSkillsAsync(Guid postId);
}

public class ApplicationRepository : EntityRepository<Application>, IApplicationRepository
{
    public ApplicationRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Application>> GetAllAsync()
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .ToListAsync();

    public override async Task<Application?> GetByIdAsync(Guid id)
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .FirstOrDefaultAsync(a => a.ApplicationId == id);

    public async Task<List<Application>> GetByLearnerIdAsync(Guid learnerId)
        => await _dbSet
            .Where(a => a.LearnerId == learnerId)
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .ToListAsync();

    public async Task<Application?> GetByLearnerAndPostAsync(Guid learnerId, Guid postId)
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .FirstOrDefaultAsync(a => a.LearnerId == learnerId && a.PostId == postId);

    public async Task<List<Application>> GetByCompanyIdAsync(Guid companyId)
        => await _dbSet
            .Where(a => a.Post.CompanyId == companyId)
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .Include(a => a.Learner).ThenInclude(l => l.User)
            .ToListAsync();

    public async Task<Application?> GetByIdWithLearnerAsync(Guid applicationId)
        => await _dbSet
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .Include(a => a.Learner).ThenInclude(l => l.User)
            .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

    public async Task<Application?> GetByIdWithLearnerAndSkillsAsync(Guid applicationId)
        => await _dbSet
            .Where(a => a.ApplicationId == applicationId)
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .Include(a => a.Learner).ThenInclude(l => l.User)
            .Include(a => a.Learner).ThenInclude(l => l.LearnerSkills).ThenInclude(ls => ls.Skill)
            .FirstOrDefaultAsync();

    public async Task<List<Application>> GetByPostIdWithLearnerAndSkillsAsync(Guid postId)
        => await _dbSet
            .Where(a => a.PostId == postId)
            .Include(a => a.Post).ThenInclude(p => p.Company)
            .Include(a => a.Learner).ThenInclude(l => l.User)
            .Include(a => a.Learner).ThenInclude(l => l.LearnerSkills).ThenInclude(ls => ls.Skill)
            .ToListAsync();
}