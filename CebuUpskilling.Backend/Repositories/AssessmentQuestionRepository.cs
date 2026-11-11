using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IAssessmentQuestionRepository : IRepository<AssessmentQuestion>
{
    Task<List<AssessmentQuestion>> GetBySkillIdAsync(Guid skillId);
    Task<List<AssessmentQuestion>> GetBySkillIdAndSourceAsync(Guid skillId, AssessmentSource source);
    Task<List<AssessmentQuestion>> GetBySkillIdsAndSourceAsync(List<Guid> skillIds, AssessmentSource source);
    Task<Dictionary<Guid, AssessmentQuestion>> GetBySkillIdDictionaryAsync(Guid skillId);
    Task<Dictionary<Guid, int>> GetQuestionCountsBySkillIdsAsync(List<Guid> skillIds);
    Task<Dictionary<Guid, int>> GetCompanyQuestionCountsBySkillIdsAsync(List<Guid> skillIds);
}

public class AssessmentQuestionRepository : Repository<AssessmentQuestion>, IAssessmentQuestionRepository
{
    public AssessmentQuestionRepository(ApplicationDbContext context) : base(context) { }

    public async Task<List<AssessmentQuestion>> GetBySkillIdAsync(Guid skillId)
        => await _dbSet
            .Include(q => q.Company)
            .Where(q => q.SkillId == skillId)
            .OrderBy(q => q.AssessmentQuestionId)
            .ToListAsync();

    public async Task<List<AssessmentQuestion>> GetBySkillIdAndSourceAsync(Guid skillId, AssessmentSource source)
        => await _dbSet
            .Include(q => q.Company)
            .Where(q => q.SkillId == skillId && q.Source == source)
            .OrderBy(q => q.AssessmentQuestionId)
            .ToListAsync();

    public async Task<List<AssessmentQuestion>> GetBySkillIdsAndSourceAsync(List<Guid> skillIds, AssessmentSource source)
        => await _dbSet
            .Include(q => q.Company)
            .Where(q => skillIds.Contains(q.SkillId) && q.Source == source)
            .OrderBy(q => q.AssessmentQuestionId)
            .ToListAsync();

    public async Task<Dictionary<Guid, AssessmentQuestion>> GetBySkillIdDictionaryAsync(Guid skillId)
        => await _dbSet.Where(q => q.SkillId == skillId).ToDictionaryAsync(q => q.AssessmentQuestionId);

    public async Task<Dictionary<Guid, int>> GetQuestionCountsBySkillIdsAsync(List<Guid> skillIds)
        => (await _dbSet
            .Where(q => skillIds.Contains(q.SkillId))
            .Select(q => new { q.SkillId })
            .ToListAsync())
            .GroupBy(q => q.SkillId)
            .ToDictionary(g => g.Key, g => g.Count());

    public async Task<Dictionary<Guid, int>> GetCompanyQuestionCountsBySkillIdsAsync(List<Guid> skillIds)
        => (await _dbSet
            .Where(q => skillIds.Contains(q.SkillId) && q.Source == AssessmentSource.Company)
            .Select(q => new { q.SkillId })
            .ToListAsync())
            .GroupBy(q => q.SkillId)
            .ToDictionary(g => g.Key, g => g.Count());
}