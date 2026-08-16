using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class PostsController : BaseEntityController<Post>
{
    public PostsController(IEntityService<Post> service, ILogger<PostsController> logger)
        : base(service, logger, "Posts") { }

    protected override int GetId(Post entity) => entity.PostId;

    [HttpPost]
    [Authorize(Roles = "Recruiter")]
    public override Task<ActionResult<Post>> Create(Post entity) => base.Create(entity);

    [HttpPut("{id}")]
    [Authorize(Roles = "Recruiter")]
    public override Task<ActionResult<Post>> Update(int id, Post entity) => base.Update(id, entity);

    [HttpDelete("{id}")]
    [Authorize(Roles = "Recruiter")]
    public override Task<IActionResult> Delete(int id) => base.Delete(id);
}
