using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class LessonContentsController : BaseEntityController<LessonContent>
{
    public LessonContentsController(IEntityService<LessonContent> service, ILogger<LessonContentsController> logger)
        : base(service, logger, "LessonContents") { }

    protected override int GetId(LessonContent entity) => entity.ContentId;
}