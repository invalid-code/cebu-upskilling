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

    [HttpGet("{id}/detail")]
    public async Task<ActionResult<CourseDetailDto>> GetCourseDetail(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("GET /api/Courses/{Id}/detail called by user {UserId}", id, userId);

        var result = await _coursesPageService.GetCourseDetailAsync(userId, id);
        if (result == null)
            return NotFound(new { error = "Course not found" });

        return Ok(result);
    }
}