using System.Security.Claims;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Controllers;

public class PostsController : BaseEntityController<Post>
{
    private readonly ApplicationDbContext _context;

    public PostsController(IEntityService<Post> service, ApplicationDbContext context, ILogger<PostsController> logger)
        : base(service, logger, "Posts")
    {
        _context = context;
    }

    protected override int GetId(Post entity) => entity.PostId;

    [HttpPost]
    [Authorize(Roles = "Recruiter")]
    public override Task<ActionResult<Post>> Create(Post entity) => base.Create(entity);

    [HttpPut("{id}")]
    [Authorize(Roles = "Recruiter")]
    public override async Task<ActionResult<Post>> Update(int id, Post entity)
    {
        if (!await IsOwnerAsync(id))
        {
            _logger.LogWarning("Update rejected: recruiter is not the owner of post {PostId}", id);
            return NotFound();
        }

        // Ignore a client-supplied RecruiterId so ownership can never be transferred.
        entity.RecruiterId = (await GetCurrentRecruiterIdAsync())!.Value;
        return await base.Update(id, entity);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Recruiter")]
    public override async Task<IActionResult> Delete(int id)
    {
        if (!await IsOwnerAsync(id))
        {
            _logger.LogWarning("Delete rejected: recruiter is not the owner of post {PostId}", id);
            return NotFound();
        }

        return await base.Delete(id);
    }

    private async Task<bool> IsOwnerAsync(int postId)
    {
        var recruiterId = await GetCurrentRecruiterIdAsync();
        if (recruiterId is null) return false;

        return await _context.Posts.AnyAsync(p => p.PostId == postId && p.RecruiterId == recruiterId.Value);
    }

    private async Task<int?> GetCurrentRecruiterIdAsync()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        return (await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId))?.RecruiterId;
    }
}