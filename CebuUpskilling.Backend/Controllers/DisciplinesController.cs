using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class DisciplinesController : BaseEntityController<Discipline>
{
    public DisciplinesController(IEntityService<Discipline> service, ILogger<DisciplinesController> logger)
        : base(service, logger, "Disciplines") { }

    protected override int GetId(Discipline entity) => entity.DomainId;
}