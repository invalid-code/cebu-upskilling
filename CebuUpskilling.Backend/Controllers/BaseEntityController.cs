using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public abstract class BaseEntityController<T> : ControllerBase where T : class
{
    protected readonly IEntityService<T> _service;
    protected readonly ILogger _logger;
    protected readonly string _entityName;

    protected BaseEntityController(IEntityService<T> service, ILogger logger, string entityName)
    {
        _service = service;
        _logger = logger;
        _entityName = entityName;
    }

    [HttpGet]
    public virtual async Task<ActionResult<List<T>>> GetAll()
    {
        _logger.LogInformation("GET /api/{Controller} called", _entityName);
        var results = await _service.GetAllAsync();
        _logger.LogInformation("GET /api/{Controller} returned {Count} items", _entityName, results.Count);
        return Ok(results);
    }

    [HttpGet("{id}")]
    public virtual async Task<ActionResult<T>> GetById(int id)
    {
        _logger.LogInformation("GET /api/{Controller}/{Id} called", _entityName, id);
        var entity = await _service.GetByIdAsync(id);
        if (entity == null)
        {
            _logger.LogWarning("GET /api/{Controller}/{Id} - not found", _entityName, id);
            return NotFound();
        }
        return Ok(entity);
    }

    [HttpPost]
    public virtual async Task<ActionResult<T>> Create(T entity)
    {
        _logger.LogInformation("POST /api/{Controller} called", _entityName);
        var created = await _service.CreateAsync(entity);
        _logger.LogInformation("POST /api/{Controller} - created successfully", _entityName);
        return CreatedAtAction(nameof(GetById), new { id = GetId(created) }, created);
    }

    [HttpPut("{id}")]
    public virtual async Task<ActionResult<T>> Update(int id, T entity)
    {
        _logger.LogInformation("PUT /api/{Controller}/{Id} called", _entityName, id);
        var updated = await _service.UpdateAsync(id, entity);
        if (updated == null)
        {
            _logger.LogWarning("PUT /api/{Controller}/{Id} - not found", _entityName, id);
            return NotFound();
        }
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public virtual async Task<IActionResult> Delete(int id)
    {
        _logger.LogInformation("DELETE /api/{Controller}/{Id} called", _entityName, id);
        var result = await _service.DeleteAsync(id);
        if (!result)
        {
            _logger.LogWarning("DELETE /api/{Controller}/{Id} - not found", _entityName, id);
            return NotFound();
        }
        return NoContent();
    }

    protected abstract int GetId(T entity);
}