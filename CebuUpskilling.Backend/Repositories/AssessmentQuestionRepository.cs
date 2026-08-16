using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IAssessmentQuestionRepository : IRepository<AssessmentQuestion>
{
    Task<List<AssessmentQuestion>> GetBySkillIdAsync(int skillId);
    Task<List<AssessmentQuestion>> GetBySkillIdAndSourceAsync(int skillId, AssessmentSource source);
    Task<List<AssessmentQuestion>> GetBySkillIdsAndSourceAsync(List<int> skillIds, AssessmentSource source);
    Task<Dictionary<int, AssessmentQuestion>> GetBySkillIdDictionaryAsync(int skillId);
    Task<Dictionary<int, int>> GetQuestionCountsBySkillIdsAsync(List<int> skillIds);
    Task<Dictionary<int, int>> GetCompanyQuestionCountsBySkillIdsAsync(List<int> skillIds);
}

public class AssessmentQuestionRepository : Repository<AssessmentQuestion>, IAssessmentQuestionRepository
{
    public AssessmentQuestionRepository(ApplicationDbContext context) : base(context) { }

    public async Task<List<AssessmentQuestion>> GetBySkillIdAsync(int skillId)
        => await _dbSet
            .Include(q => q.Company)
            .Where(q => q.SkillId == skillId)
            .OrderBy(q => q.AssessmentQuestionId)
            .ToListAsync();

    public async Task<List<AssessmentQuestion>> GetBySkillIdAndSourceAsync(int skillId, AssessmentSource source)
        => await _dbSet
            .Include(q => q.Company)
            .Where(q => q.SkillId == skillId && q.Source == source)
            .OrderBy(q => q.AssessmentQuestionId)
            .ToListAsync();

    public async Task<List<AssessmentQuestion>> GetBySkillIdsAndSourceAsync(List<int> skillIds, AssessmentSource source)
        => await _dbSet
            .Include(q => q.Company)
            .Where(q => skillIds.Contains(q.SkillId) && q.Source == source)
            .OrderBy(q => q.AssessmentQuestionId)
            .ToListAsync();

    public async Task<Dictionary<int, AssessmentQuestion>> GetBySkillIdDictionaryAsync(int skillId)
        => await _dbSet.Where(q => q.SkillId == skillId).ToDictionaryAsync(q => q.AssessmentQuestionId);

    public async Task<Dictionary<int, int>> GetQuestionCountsBySkillIdsAsync(List<int> skillIds)
        => await _dbSet
            .Where(q => skillIds.Contains(q.SkillId))
            .GroupBy(q => q.SkillId)
            .ToDictionaryAsync(g => g.Key, g => g.Count());

    public async Task<Dictionary<int, int>> GetCompanyQuestionCountsBySkillIdsAsync(List<int> skillIds)
        => await _dbSet
            .Where(q => skillIds.Contains(q.SkillId) && q.Source == AssessmentSource.Company)
            .GroupBy(q => q.SkillId)
            .ToDictionaryAsync(g => g.Key, g => g.Count());
}