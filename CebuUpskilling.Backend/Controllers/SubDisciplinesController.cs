using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class SubDisciplinesController : BaseEntityController<SubDiscipline>
{
    public SubDisciplinesController(IEntityService<SubDiscipline> service, ILogger<SubDisciplinesController> logger)
        : base(service, logger, "SubDisciplines") { }

    protected override int GetId(SubDiscipline entity) => entity.SubDisciplineId;
}