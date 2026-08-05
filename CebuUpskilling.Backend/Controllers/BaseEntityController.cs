using CebuUpskilling.Backend.Entities;
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

public class DisciplinesController : BaseEntityController<Discipline>
{
    public DisciplinesController(IEntityService<Discipline> service, ILogger<DisciplinesController> logger)
        : base(service, logger, "Disciplines") { }

    protected override int GetId(Discipline entity) => entity.DomainId;
}

public class SubDisciplinesController : BaseEntityController<SubDiscipline>
{
    public SubDisciplinesController(IEntityService<SubDiscipline> service, ILogger<SubDisciplinesController> logger)
        : base(service, logger, "SubDisciplines") { }

    protected override int GetId(SubDiscipline entity) => entity.SubDisciplineId;
}

public class GenresController : BaseEntityController<Genre>
{
    public GenresController(IEntityService<Genre> service, ILogger<GenresController> logger)
        : base(service, logger, "Genres") { }

    protected override int GetId(Genre entity) => entity.GenreId;
}

public class CoursesController : BaseEntityController<Course>
{
    public CoursesController(IEntityService<Course> service, ILogger<CoursesController> logger)
        : base(service, logger, "Courses") { }

    protected override int GetId(Course entity) => entity.CourseId;
}

public class LessonsController : BaseEntityController<Lesson>
{
    public LessonsController(IEntityService<Lesson> service, ILogger<LessonsController> logger)
        : base(service, logger, "Lessons") { }

    protected override int GetId(Lesson entity) => entity.LessonId;
}

public class LessonContentsController : BaseEntityController<LessonContent>
{
    public LessonContentsController(IEntityService<LessonContent> service, ILogger<LessonContentsController> logger)
        : base(service, logger, "LessonContents") { }

    protected override int GetId(LessonContent entity) => entity.ContentId;
}

public class ExercisesController : BaseEntityController<Exercise>
{
    public ExercisesController(IEntityService<Exercise> service, ILogger<ExercisesController> logger)
        : base(service, logger, "Exercises") { }

    protected override int GetId(Exercise entity) => entity.ExerciseId;
}

public class CompaniesController : BaseEntityController<Company>
{
    public CompaniesController(IEntityService<Company> service, ILogger<CompaniesController> logger)
        : base(service, logger, "Companies") { }

    protected override int GetId(Company entity) => entity.CompanyId;
}

public class PostsController : BaseEntityController<Post>
{
    public PostsController(IEntityService<Post> service, ILogger<PostsController> logger)
        : base(service, logger, "Posts") { }

    protected override int GetId(Post entity) => entity.PostId;
}

public class LearnersController : BaseEntityController<Learner>
{
    public LearnersController(IEntityService<Learner> service, ILogger<LearnersController> logger)
        : base(service, logger, "Learners") { }

    protected override int GetId(Learner entity) => entity.LearnerId;
}
