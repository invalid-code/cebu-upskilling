using System.Security.Claims;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

[Authorize(Roles = "Recruiter")]
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

    [HttpPost]
    [Authorize(Roles = "Recruiter")]
    public override async Task<ActionResult<Post>> Create(Post entity)
        => await base.Create(entity);

    [HttpPut("{id}")]
    [Authorize(Roles = "Recruiter")]
    public override async Task<ActionResult<Post>> Update(int id, Post entity)
        => await base.Update(id, entity);

    [HttpDelete("{id}")]
    [Authorize(Roles = "Recruiter")]
    public override async Task<IActionResult> Delete(int id)
        => await base.Delete(id);
}

[Authorize(Roles = "Learner")]
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

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Learner")]
public class EnrollmentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<EnrollmentsController> _logger;

    public EnrollmentsController(ApplicationDbContext context, ILogger<EnrollmentsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyEnrollments()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var learner = await _context.Learners.FirstOrDefaultAsync(l => l.UserId == userId);
        if (learner == null)
            return BadRequest(new { error = "No learner profile found" });

        var enrollments = await _context.LearnerStudyCourses
            .Where(lsc => lsc.LearnerId == learner.LearnerId)
            .Select(lsc => new
            {
                lsc.CourseId,
                CourseName = lsc.Course.Name,
                lsc.Started,
                lsc.LastTotalProgressPercent,
            })
            .ToListAsync();

        return Ok(enrollments);
    }

    [HttpPost]
    public async Task<IActionResult> Enroll([FromBody] EnrollRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("User {UserId} attempting to enroll in course {CourseId}", userId, request.CourseId);

        var learner = await _context.Learners.FirstOrDefaultAsync(l => l.UserId == userId);
        if (learner == null)
        {
            _logger.LogWarning("No learner profile found for user {UserId}", userId);
            return BadRequest(new { error = "No learner profile found" });
        }

        var course = await _context.Courses.FindAsync(request.CourseId);
        if (course == null)
        {
            _logger.LogWarning("Course {CourseId} not found", request.CourseId);
            return NotFound(new { error = "Course not found" });
        }

        var existing = await _context.LearnerStudyCourses
            .FirstOrDefaultAsync(lsc => lsc.LearnerId == learner.LearnerId && lsc.CourseId == request.CourseId);

        if (existing != null)
        {
            _logger.LogInformation("User {UserId} already enrolled in course {CourseId}", userId, request.CourseId);
            return Ok(new { message = "Already enrolled" });
        }

        var enrollment = new LearnerStudyCourse
        {
            LearnerId = learner.LearnerId,
            CourseId = request.CourseId,
            Started = DateTime.UtcNow,
            LastTotalProgressPercent = 0,
        };

        _context.LearnerStudyCourses.Add(enrollment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} enrolled in course {CourseId}", userId, request.CourseId);
        return StatusCode(201, new { enrollment.CourseId, enrollment.Started });
    }
}

public record EnrollRequest(int CourseId);
