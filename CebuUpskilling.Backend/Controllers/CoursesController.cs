using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class CoursesController : BaseEntityController<Course>
{
    public CoursesController(IEntityService<Course> service, ILogger<CoursesController> logger)
        : base(service, logger, "Courses") { }

    protected override int GetId(Course entity) => entity.CourseId;
}