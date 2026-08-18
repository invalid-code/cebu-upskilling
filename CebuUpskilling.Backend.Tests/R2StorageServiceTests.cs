using CebuUpskilling.Backend.Options;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CebuUpskilling.Backend.Tests;

[Trait("Category", "ExternalIntegration")]
public class R2StorageServiceTests
{
    private sealed class StubEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Tests";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = Path.Combine(Path.GetTempPath(), "r2tests", "wwwroot");
        public string EnvironmentName { get; set; } = "Testing";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }

    private static R2StorageService CreateService(string publicBaseUrl) => new(
        Microsoft.Extensions.Options.Options.Create(new R2Options
        {
            AccountId = "test-account",
            AccessKeyId = "test-access-key",
            SecretAccessKey = "test-secret-key",
            BucketName = "test-bucket",
            PublicBaseUrl = publicBaseUrl,
        }),
        NullLogger<R2StorageService>.Instance,
        new StubEnvironment()
    );

    [Fact]
    public void GetPublicUrl_JoinsBaseUrlAndKey_WithTrailingSlash()
    {
        var service = CreateService("https://media.example.com/");

        var url = service.GetPublicUrl("course-content/7/video.mp4");

        Assert.Equal("https://media.example.com/course-content/7/video.mp4", url);
    }

    [Fact]
    public void GetPublicUrl_JoinsBaseUrlAndKey_WithoutTrailingSlash()
    {
        var service = CreateService("https://media.example.com");

        var url = service.GetPublicUrl("course-content/7/video.mp4");

        Assert.Equal("https://media.example.com/course-content/7/video.mp4", url);
    }

    [Fact]
    public async Task UploadAsync_FallsBackToLocalDisk_WhenR2IsNotConfigured()
    {
        var service = new R2StorageService(
            Microsoft.Extensions.Options.Options.Create(new R2Options()),
            NullLogger<R2StorageService>.Instance,
            new StubEnvironment()
        );

        await using var stream = new MemoryStream("resume bytes"u8.ToArray());
        var url = await service.UploadAsync("documents/abc.pdf", stream, "application/pdf");

        Assert.StartsWith("/uploads/documents/", url);
        var filePath = Path.Combine(Path.GetTempPath(), "r2tests", "wwwroot", "uploads", "documents", "abc.pdf");
        Assert.True(File.Exists(filePath), "Local fallback file should exist on disk");
        File.Delete(filePath);
    }
}
