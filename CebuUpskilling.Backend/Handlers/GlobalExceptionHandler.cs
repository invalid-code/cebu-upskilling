using Microsoft.AspNetCore.Diagnostics;

namespace CebuUpskilling.Backend.Handlers;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is KeyNotFoundException)
        {
            logger.LogWarning(exception, "Resource not found for {Method} {Path}",
                httpContext.Request.Method, httpContext.Request.Path);
            httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            await httpContext.Response.WriteAsJsonAsync(new
            {
                error = "Resource not found"
            }, cancellationToken);

            return true;
        }

        if (exception is UnauthorizedAccessException)
        {
            logger.LogWarning(exception, "Unauthorized access for {Method} {Path}",
                httpContext.Request.Method, httpContext.Request.Path);
            httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await httpContext.Response.WriteAsJsonAsync(new
            {
                error = "Unauthorized"
            }, cancellationToken);

            return true;
        }

        if (exception is InvalidOperationException)
        {
            logger.LogWarning(exception, "Invalid operation for {Method} {Path}: {Message}",
                httpContext.Request.Method, httpContext.Request.Path, exception.Message);
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsJsonAsync(new
            {
                error = exception.Message
            }, cancellationToken);

            return true;
        }

        logger.LogError(exception, "Unhandled exception for {Method} {Path}",
            httpContext.Request.Method, httpContext.Request.Path);

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(new
        {
            error = "An unexpected error occurred"
        }, cancellationToken);

        return true;
    }
}