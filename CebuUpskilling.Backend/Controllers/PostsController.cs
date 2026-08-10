using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

public class PostsController : BaseEntityController<Post>
{
    public PostsController(IEntityService<Post> service, ILogger<PostsController> logger)
        : base(service, logger, "Posts") { }

    protected override int GetId(Post entity) => entity.PostId;
}