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

        if (exception is InvalidOperationException invalidOp)
        {
            // Never leak secrets or storage internals: only the sanitized Message is returned.
            // R2StorageService already wraps AmazonS3Exception into a generic InvalidOperationException.
            logger.LogWarning("Invalid operation for {Method} {Path}: {Message}",
                httpContext.Request.Method, httpContext.Request.Path, invalidOp.Message);
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsJsonAsync(new
            {
                error = invalidOp.Message
            }, cancellationToken);

            return true;
        }

        // Explicitly handle storage SDK failures without leaking credentials, bucket names, or account IDs.
        if (exception is Amazon.S3.AmazonS3Exception s3Ex)
        {
            logger.LogWarning(s3Ex, "Storage request failed for {Method} {Path} (status {StatusCode})",
                httpContext.Request.Method, httpContext.Request.Path, s3Ex.StatusCode);
            httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await httpContext.Response.WriteAsJsonAsync(new
            {
                error = "Storage is temporarily unavailable. Please try again later."
            }, cancellationToken);

            return true;
        }

        if (exception is Amazon.Runtime.AmazonServiceException svcEx)
        {
            logger.LogWarning(svcEx, "Storage service error for {Method} {Path}",
                httpContext.Request.Method, httpContext.Request.Path);
            httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await httpContext.Response.WriteAsJsonAsync(new
            {
                error = "Storage is temporarily unavailable. Please try again later."
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