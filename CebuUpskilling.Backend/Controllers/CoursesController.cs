using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class CoursesController : BaseEntityController<Course>
{
    private readonly ICoursesPageService _coursesPageService;

    public CoursesController(
        IEntityService<Course> service,
        ICoursesPageService coursesPageService,
        ILogger<CoursesController> logger)
        : base(service, logger, "Courses")
    {
        _coursesPageService = coursesPageService;
    }

    protected override int GetId(Course entity) => entity.CourseId;

    // Course writes are owned by CourseManagementController (Recruiter/CourseProvider,
    // scoped to the caller's CompanyId). The generic create/update/delete inherited from
    // BaseEntityController<Course> would let any authenticated caller publish courses
    // under another company (Course.Status/CompanyId/CreatedBy are bindable) and delete
    // courses, cascading to modules, lessons, learner notes and discussion posts.
    // Reads stay open: the catalogue is authenticated-but-public content.
    [HttpPost]
    public override Task<ActionResult<Course>> Create(Course entity) =>
        Task.FromResult<ActionResult<Course>>(NotFound());

    [HttpPut("{id}")]
    public override Task<ActionResult<Course>> Update(int id, Course entity) =>
        Task.FromResult<ActionResult<Course>>(NotFound());

    [HttpDelete("{id}")]
    public override Task<IActionResult> Delete(int id) =>
        Task.FromResult<IActionResult>(NotFound());

    [HttpGet("{id}/detail")]
    public async Task<ActionResult<CourseDetailDto>> GetCourseDetail(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP GET /api/courses/{Id}/detail called by user {UserId}", id, userId);

        var result = await _coursesPageService.GetCourseDetailAsync(userId, id);
        if (result == null)
            return NotFound(new { error = "Course not found" });

        return Ok(result);
    }
}