using System.Security.Claims;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/posts")]
[Authorize]
public class PostsController : ControllerBase
{
    private readonly IPostService _service;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PostsController> _logger;

    public PostsController(IPostService service, ApplicationDbContext context, ILogger<PostsController> logger)
    {
        _service = service;
        _context = context;
        _logger = logger;
    }

    private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private async Task<int?> GetUserCompanyIdAsync()
        => (await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == UserId))?.CompanyId;

    [HttpGet]
    public async Task<ActionResult<PagedPostsResponse>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? targetRole,
        [FromQuery] string? jobType,
        [FromQuery] string? location,
        [FromQuery] bool? isRemote,
        [FromQuery] string? sortBy,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        _logger.LogInformation("HTTP GET /api/posts called");
        var query = new PostQueryParams(
            Search: search,
            TargetRole: targetRole,
            JobType: jobType,
            Location: location,
            IsRemote: isRemote,
            SortBy: sortBy,
            Page: page,
            PageSize: pageSize);
        var results = await _service.SearchAsync(query);
        return Ok(results);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PostResponse>> GetById(int id)
    {
        _logger.LogInformation("HTTP GET /api/posts/{Id} called", id);
        var entity = await _service.GetByIdAsync(id);
        if (entity == null)
        {
            _logger.LogWarning("HTTP GET /api/posts/{Id} - not found", id);
            return NotFound();
        }
        return Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Recruiter")]
    public async Task<ActionResult<PostResponse>> Create(PostRequest request)
    {
        var companyId = await GetUserCompanyIdAsync();
        if (companyId == null)
        {
            return BadRequest(new { error = "No company associated with this account" });
        }

        _logger.LogInformation("HTTP POST /api/posts called by user {UserId} for company {CompanyId}", UserId, companyId.Value);
        var created = await _service.CreateAsync(request, companyId.Value);
        return CreatedAtAction(nameof(GetById), new { id = created.PostId }, created);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Recruiter")]
    public async Task<ActionResult<PostResponse>> Update(int id, PostRequest request)
    {
        var companyId = await GetUserCompanyIdAsync();
        if (companyId == null)
        {
            return BadRequest(new { error = "No company associated with this account" });
        }

        var existing = await _service.GetByIdAsync(id);
        if (existing == null)
        {
            _logger.LogWarning("HTTP PUT /api/posts/{Id} - not found", id);
            return NotFound();
        }

        if (existing.CompanyId != companyId.Value)
        {
            _logger.LogWarning("User {UserId} attempted to update post {Id} of another company", UserId, id);
            return NotFound();
        }

        _logger.LogInformation("HTTP PUT /api/posts/{Id} called by user {UserId}", id, UserId);
        var updated = await _service.UpdateAsync(id, request);
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Recruiter")]
    public async Task<IActionResult> Delete(int id)
    {
        var companyId = await GetUserCompanyIdAsync();
        if (companyId == null)
        {
            return BadRequest(new { error = "No company associated with this account" });
        }

        var existing = await _service.GetByIdAsync(id);
        if (existing == null)
        {
            _logger.LogWarning("HTTP DELETE /api/posts/{Id} - not found", id);
            return NotFound();
        }

        if (existing.CompanyId != companyId.Value)
        {
            _logger.LogWarning("User {UserId} attempted to delete post {Id} of another company", UserId, id);
            return NotFound();
        }

        _logger.LogInformation("HTTP DELETE /api/posts/{Id} called by user {UserId}", id, UserId);
        var result = await _service.DeleteAsync(id);
        if (!result)
        {
            return NotFound();
        }
        return NoContent();
    }
}