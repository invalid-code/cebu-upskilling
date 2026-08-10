using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class CompaniesController : BaseEntityController<Company>
{
    public CompaniesController(IEntityService<Company> service, ILogger<CompaniesController> logger)
        : base(service, logger, "Companies") { }

    protected override int GetId(Company entity) => entity.CompanyId;
}