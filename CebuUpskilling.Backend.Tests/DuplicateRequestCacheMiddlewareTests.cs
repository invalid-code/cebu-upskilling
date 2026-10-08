using System.Security.Claims;
using System.Text;
using CebuUpskilling.Backend.Middleware;
using CebuUpskilling.Backend.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Tests;

public class DuplicateRequestCacheMiddlewareTests : IDisposable
{
    private readonly IMemoryCache _cache = new MemoryCache(new MemoryCacheOptions());
    private readonly DuplicateRequestCacheOptions _opts = new() { Enabled = true, TtlSeconds = 60, MaxCachedBodyBytes = 256 * 1024 };

    public void Dispose()
    {
        _cache.Dispose();
        GC.SuppressFinalize(this);
    }

    private DuplicateRequestCacheMiddleware CreateMiddleware(RequestDelegate next) =>
        new(next, _cache, Microsoft.Extensions.Options.Options.Create(_opts),
            NullLogger<DuplicateRequestCacheMiddleware>.Instance);

    private static DefaultHttpContext CreateGetContext(string path, string query = "", Guid? userId = null)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Get;
        context.Request.Path = path;
        context.Request.QueryString = new QueryString(query);
        context.Response.Body = new MemoryStream();
        if (userId.HasValue)
        {
            context.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()),
            }, "test"));
        }
        return context;
    }

    private static string ReadBody(HttpContext context)
    {
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body, Encoding.UTF8, leaveOpen: true);
        var text = reader.ReadToEnd();
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        return text;
    }

    [Fact]
    public async Task SecondIdenticalGet_ServesFromCache_WithoutReexecuting()
    {
        var calls = 0;
        RequestDelegate next = async ctx =>
        {
            calls++;
            ctx.Response.StatusCode = 200;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync("{\"ok\":true}");
        };
        var middleware = CreateMiddleware(next);
        var userId = Guid.NewGuid();

        var first = CreateGetContext("/api/posts", "?page=1", userId);
        await middleware.InvokeAsync(first);
        Assert.Equal(1, calls);
        Assert.Equal("MISS", first.Response.Headers["X-Cache"].ToString());

        var second = CreateGetContext("/api/posts", "?page=1", userId);
        await middleware.InvokeAsync(second);
        Assert.Equal(1, calls);
        Assert.Equal("HIT", second.Response.Headers["X-Cache"].ToString());
        Assert.Equal("{\"ok\":true}", ReadBody(second));
    }

    [Fact]
    public async Task DifferentUser_DoesNotSeeCachedBody()
    {
        var calls = 0;
        RequestDelegate next = async ctx =>
        {
            calls++;
            ctx.Response.StatusCode = 200;
            ctx.Response.ContentType = "application/json";
            var id = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anon";
            await ctx.Response.WriteAsync($"{{\"user\":\"{id}\"}}");
        };
        var middleware = CreateMiddleware(next);

        var first = CreateGetContext("/api/skillgaps", "", Guid.NewGuid());
        await middleware.InvokeAsync(first);
        var second = CreateGetContext("/api/skillgaps", "", Guid.NewGuid());
        await middleware.InvokeAsync(second);

        Assert.Equal(2, calls);
        Assert.Equal("MISS", second.Response.Headers["X-Cache"].ToString());
    }

    [Fact]
    public async Task MutatingRequest_InvalidatesCallerGetCache()
    {
        var calls = 0;
        RequestDelegate next = async ctx =>
        {
            if (HttpMethods.IsGet(ctx.Request.Method))
            {
                calls++;
                ctx.Response.StatusCode = 200;
                ctx.Response.ContentType = "application/json";
                await ctx.Response.WriteAsync($"{{\"v\":{calls}}}");
            }
            else
            {
                ctx.Response.StatusCode = 200;
            }
        };
        var middleware = CreateMiddleware(next);
        var userId = Guid.NewGuid();

        var get1 = CreateGetContext("/api/posts", "", userId);
        await middleware.InvokeAsync(get1);
        Assert.Equal(1, calls);

        var post = new DefaultHttpContext();
        post.Request.Method = HttpMethods.Post;
        post.Request.Path = "/api/posts";
        post.Response.Body = new MemoryStream();
        post.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
        }, "test"));
        await middleware.InvokeAsync(post);

        var get2 = CreateGetContext("/api/posts", "", userId);
        await middleware.InvokeAsync(get2);
        Assert.Equal(2, calls);
        Assert.Equal("MISS", get2.Response.Headers["X-Cache"].ToString());
    }

    [Fact]
    public async Task NonSuccessResponse_IsNotCached()
    {
        var calls = 0;
        RequestDelegate next = async ctx =>
        {
            calls++;
            ctx.Response.StatusCode = 500;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync("{\"error\":\"boom\"}");
        };
        var middleware = CreateMiddleware(next);
        var userId = Guid.NewGuid();

        await middleware.InvokeAsync(CreateGetContext("/api/stats/week", "", userId));
        var second = CreateGetContext("/api/stats/week", "", userId);
        await middleware.InvokeAsync(second);

        Assert.Equal(2, calls);
        Assert.NotEqual("HIT", second.Response.Headers["X-Cache"].ToString());
    }

    [Fact]
    public async Task AuthPath_IsNeverCached()
    {
        var calls = 0;
        RequestDelegate next = ctx =>
        {
            calls++;
            ctx.Response.StatusCode = 200;
            ctx.Response.ContentType = "application/json";
            return ctx.Response.WriteAsync("{}");
        };
        var middleware = CreateMiddleware(next);

        await middleware.InvokeAsync(CreateGetContext("/api/auth/profile"));
        await middleware.InvokeAsync(CreateGetContext("/api/auth/profile"));

        Assert.Equal(2, calls);
    }
}
