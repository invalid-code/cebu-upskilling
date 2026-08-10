using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class ExercisesController : BaseEntityController<Exercise>
{
    public ExercisesController(IEntityService<Exercise> service, ILogger<ExercisesController> logger)
        : base(service, logger, "Exercises") { }

    protected override int GetId(Exercise entity) => entity.ExerciseId;
}