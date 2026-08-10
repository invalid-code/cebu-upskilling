using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IAssessmentQuestionRepository : IRepository<AssessmentQuestion>
{
    Task<List<AssessmentQuestion>> GetBySkillIdAsync(int skillId);
    Task<Dictionary<int, AssessmentQuestion>> GetBySkillIdDictionaryAsync(int skillId);
    Task<Dictionary<int, int>> GetQuestionCountsBySkillIdsAsync(List<int> skillIds);
}

public class AssessmentQuestionRepository : Repository<AssessmentQuestion>, IAssessmentQuestionRepository
{
    public AssessmentQuestionRepository(ApplicationDbContext context) : base(context) { }

    public async Task<List<AssessmentQuestion>> GetBySkillIdAsync(int skillId)
        => await _dbSet.Where(q => q.SkillId == skillId).OrderBy(q => q.AssessmentQuestionId).ToListAsync();

    public async Task<Dictionary<int, AssessmentQuestion>> GetBySkillIdDictionaryAsync(int skillId)
        => await _dbSet.Where(q => q.SkillId == skillId).ToDictionaryAsync(q => q.AssessmentQuestionId);

    public async Task<Dictionary<int, int>> GetQuestionCountsBySkillIdsAsync(List<int> skillIds)
        => await _dbSet
            .Where(q => skillIds.Contains(q.SkillId))
            .GroupBy(q => q.SkillId)
            .ToDictionaryAsync(g => g.Key, g => g.Count());
}