using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class GenresController : BaseEntityController<Genre>
{
    public GenresController(IEntityService<Genre> service, ILogger<GenresController> logger)
        : base(service, logger, "Genres") { }

    protected override int GetId(Genre entity) => entity.GenreId;
}