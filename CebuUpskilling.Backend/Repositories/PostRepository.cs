using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Repositories;

public interface IPostRepository : IEntityRepository<Post>
{
    Task<int> CountAsync();
    Task<(List<Post> Items, int Total)> SearchAsync(PostQueryParams query);
    Task<List<Post>> GetByTargetRoleAsync(string targetRole);
}

public class PostRepository : EntityRepository<Post>, IPostRepository
{
    public PostRepository(ApplicationDbContext context) : base(context) { }

    public override async Task<List<Post>> GetAllAsync()
        => await _dbSet
            .Include(p => p.Company)
            .Include(p => p.PostSkills)
                .ThenInclude(ps => ps.Skill)
            .ToListAsync();

    public override async Task<Post?> GetByIdAsync(int id)
        => await _dbSet
            .Include(p => p.Company)
            .Include(p => p.PostSkills)
                .ThenInclude(ps => ps.Skill)
            .FirstOrDefaultAsync(p => p.PostId == id);

    public async Task<int> CountAsync() => await _dbSet.CountAsync();

    public async Task<List<Post>> GetByTargetRoleAsync(string targetRole)
        => await _dbSet
            .Include(p => p.PostSkills)
            .Where(p => p.TargetRole.ToLower() == targetRole.ToLower())
            .ToListAsync();

    public async Task<(List<Post> Items, int Total)> SearchAsync(PostQueryParams query)
    {
        IQueryable<Post> q = _dbSet.Include(p => p.Company);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            q = q.Where(p =>
                p.Title.ToLower().Contains(search) ||
                (p.Description != null && p.Description.ToLower().Contains(search)) ||
                (p.TargetRole != null && p.TargetRole.ToLower().Contains(search)) ||
                (p.Location != null && p.Location.ToLower().Contains(search)) ||
                p.Company.Name.ToLower().Contains(search));
        }

        if (query.CompanyId.HasValue)
            q = q.Where(p => p.CompanyId == query.CompanyId.Value);

        if (query.IsActive.HasValue)
            q = q.Where(p => p.IsActive == query.IsActive.Value);

        if (!string.IsNullOrWhiteSpace(query.TargetRole))
            q = q.Where(p => p.TargetRole == query.TargetRole);

        if (!string.IsNullOrWhiteSpace(query.JobType))
            q = q.Where(p => p.JobType == query.JobType);

        if (!string.IsNullOrWhiteSpace(query.Location))
            q = q.Where(p => p.Location != null && p.Location.ToLower().Contains(query.Location.ToLower()));

        if (query.IsRemote.HasValue)
            q = q.Where(p => p.IsRemote == query.IsRemote.Value);

        var total = await q.CountAsync();

        q = (query.SortBy?.ToLower() == "oldest")
            ? q.OrderBy(p => p.CreatedAt)
            : q.OrderByDescending(p => p.CreatedAt);

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }
}
