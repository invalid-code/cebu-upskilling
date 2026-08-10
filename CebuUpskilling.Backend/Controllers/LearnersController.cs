using System.Security.Claims;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class LearnersController : BaseEntityController<Learner>
{
    private readonly LearnerService _learnerService;

    public LearnersController(IEntityService<Learner> service, ILogger<LearnersController> logger, LearnerService learnerService)
        : base(service, logger, "Learners")
    {
        _learnerService = learnerService;
    }

    protected override int GetId(Learner entity) => entity.LearnerId;

    private int CurrentUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private async Task<Learner?> GetOwnLearnerAsync() => await _learnerService.GetByUserIdAsync(CurrentUserId());

    [HttpGet]
    public override async Task<ActionResult<List<Learner>>> GetAll()
    {
        var learner = await GetOwnLearnerAsync();
        return Ok(learner == null ? new List<Learner>() : new List<Learner> { learner });
    }

    [HttpGet("{id}")]
    public override async Task<ActionResult<Learner>> GetById(int id)
    {
        var learner = await GetOwnLearnerAsync();
        if (learner == null || learner.LearnerId != id)
        {
            _logger.LogWarning("GET /api/Learners/{Id} - denied: not the caller's own profile", id);
            return NotFound();
        }
        return Ok(learner);
    }

    [HttpPost]
    public override async Task<ActionResult<Learner>> Create(Learner entity)
    {
        if (entity.UserId != CurrentUserId())
        {
            _logger.LogWarning("POST /api/Learners - denied: cannot create a profile for another user");
            return BadRequest(new { error = "Cannot create a learner profile for another user" });
        }

        if (await GetOwnLearnerAsync() != null)
        {
            _logger.LogWarning("POST /api/Learners - denied: learner profile already exists");
            return BadRequest(new { error = "Learner profile already exists" });
        }

        var created = await _service.CreateAsync(entity);
        return CreatedAtAction(nameof(GetById), new { id = GetId(created) }, created);
    }

    [HttpPut("{id}")]
    public override async Task<ActionResult<Learner>> Update(int id, Learner entity)
    {
        var learner = await GetOwnLearnerAsync();
        if (learner == null || learner.LearnerId != id)
        {
            _logger.LogWarning("PUT /api/Learners/{Id} - denied: not the caller's own profile", id);
            return NotFound();
        }

        var updated = await _service.UpdateAsync(id, entity);
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public override async Task<IActionResult> Delete(int id)
    {
        var learner = await GetOwnLearnerAsync();
        if (learner == null || learner.LearnerId != id)
        {
            _logger.LogWarning("DELETE /api/Learners/{Id} - denied: not the caller's own profile", id);
            return NotFound();
        }

        return await _service.DeleteAsync(id) ? NoContent() : NotFound();
    }
}