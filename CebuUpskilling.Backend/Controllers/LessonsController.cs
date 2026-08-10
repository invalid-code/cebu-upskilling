using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class LessonsController : BaseEntityController<Lesson>
{
    public LessonsController(IEntityService<Lesson> service, ILogger<LessonsController> logger)
        : base(service, logger, "Lessons") { }

    protected override int GetId(Lesson entity) => entity.LessonId;
}