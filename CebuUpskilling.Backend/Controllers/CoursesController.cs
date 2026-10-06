using System.Security.Claims;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Controllers;

public class CoursesController : BaseEntityController<Course>
{
    private readonly ICoursesPageService _coursesPageService;
    private readonly ApplicationDbContext _db;

    public CoursesController(
        IEntityService<Course> service,
        ICoursesPageService coursesPageService,
        ApplicationDbContext db,
        ILogger<CoursesController> logger)
        : base(service, logger, "Courses")
    {
        _coursesPageService = coursesPageService;
        _db = db;
    }

    protected override int GetId(Course entity) => entity.CourseId;

    // Course writes are owned by CourseManagementController (Recruiter/CourseProvider,
    // scoped to the caller's CompanyId). The generic create/update/delete inherited from
    // BaseEntityController<Course> would let any authenticated caller publish courses
    // under another company (Course.Status/CompanyId/CreatedBy are bindable) and delete
    // courses, cascading to modules, lessons, learner notes and discussion posts.
    [HttpPost]
    public override Task<ActionResult<Course>> Create(Course entity) =>
        Task.FromResult<ActionResult<Course>>(NotFound());

    [HttpPut("{id}")]
    public override Task<ActionResult<Course>> Update(int id, Course entity) =>
        Task.FromResult<ActionResult<Course>>(NotFound());

    [HttpDelete("{id}")]
    public override Task<IActionResult> Delete(int id) =>
        Task.FromResult<IActionResult>(NotFound());

    // Reads are the authenticated catalogue: only Published courses, projected to
    // safe copies so internal fields (CompanyId, CreatedBy/UpdatedBy) and drafts
    // never leave the API. The wire shape is unchanged (Course JSON), so the
    // Overview catalogue keeps working. Detail views go through {id}/detail.
    [HttpGet]
    public override async Task<ActionResult<List<Course>>> GetAll()
    {
        _logger.LogInformation("HTTP GET /api/courses called");
        var courses = await _db.Courses.AsNoTracking()
            .Where(c => c.Status == "Published")
            .Include(c => c.Genre)
            .Include(c => c.Lessons)
            .OrderBy(c => c.Name)
            .ToListAsync();
        return Ok(courses.Select(ToCatalogueCopy).ToList());
    }

    [HttpGet("{id}")]
    public override async Task<ActionResult<Course>> GetById(int id)
    {
        _logger.LogInformation("HTTP GET /api/courses/{Id} called", id);
        var course = await _db.Courses.AsNoTracking()
            .Where(c => c.CourseId == id && c.Status == "Published")
            .Include(c => c.Genre)
            .Include(c => c.Lessons)
            .SingleOrDefaultAsync();
        if (course == null)
        {
            _logger.LogWarning("HTTP GET /api/courses/{Id} - not found", id);
            return NotFound();
        }
        return Ok(ToCatalogueCopy(course));
    }

    [HttpGet("{id}/detail")]
    public async Task<ActionResult<CourseDetailDto>> GetCourseDetail(int id)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP GET /api/courses/{Id}/detail called by user {UserId}", id, userId);

        var result = await _coursesPageService.GetCourseDetailAsync(userId, id);
        if (result == null)
            return NotFound(new { error = "Course not found" });

        return Ok(result);
    }

    private static Course ToCatalogueCopy(Course c) => new()
    {
        CourseId = c.CourseId,
        GenreId = c.GenreId,
        Name = c.Name,
        TechnicalLevel = c.TechnicalLevel,
        Description = c.Description,
        Price = c.Price,
        CompanyId = null,
        Status = c.Status,
        Mode = c.Mode,
        Genre = c.Genre,
        Lessons = c.Lessons,
        CreatedAt = c.CreatedAt,
        CreatedBy = null,
        UpdatedAt = c.UpdatedAt,
        UpdatedBy = null,
    };
}