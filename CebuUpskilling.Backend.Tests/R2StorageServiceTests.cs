using CebuUpskilling.Backend.Options;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

[Trait("Category", "ExternalIntegration")]
public class R2StorageServiceTests
{
    private static R2StorageService CreateService(string publicBaseUrl) => new(
        Microsoft.Extensions.Options.Options.Create(new R2Options
        {
            AccountId = "test-account",
            AccessKeyId = "test-access-key",
            SecretAccessKey = "test-secret-key",
            BucketName = "test-bucket",
            PublicBaseUrl = publicBaseUrl,
        }),
        NullLogger<R2StorageService>.Instance
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
    public async Task UploadAsync_ThrowsWhenR2IsNotConfigured_StrictR2Only()
    {
        var service = new R2StorageService(
            Microsoft.Extensions.Options.Options.Create(new R2Options()),
            NullLogger<R2StorageService>.Instance
        );

        await using var stream = new MemoryStream("resume bytes"u8.ToArray());
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.UploadAsync("documents/abc.pdf", stream, "application/pdf"));

        Assert.Contains("R2 storage is not configured", ex.Message);
        Assert.Contains("Local disk fallback is disabled", ex.Message);
    }

    [Fact]
    public async Task DeleteAsync_ThrowsWhenR2IsNotConfigured_StrictR2Only()
    {
        var service = new R2StorageService(
            Microsoft.Extensions.Options.Options.Create(new R2Options()),
            NullLogger<R2StorageService>.Instance
        );

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DeleteAsync("documents/abc.pdf"));

        Assert.Contains("R2 storage is not configured", ex.Message);
    }

    [Fact]
    public void GetPublicUrl_ThrowsWhenR2IsNotConfigured_StrictR2Only()
    {
        var service = new R2StorageService(
            Microsoft.Extensions.Options.Options.Create(new R2Options()),
            NullLogger<R2StorageService>.Instance
        );

        var ex = Assert.Throws<InvalidOperationException>(() => service.GetPublicUrl("documents/abc.pdf"));
        Assert.Contains("R2 storage is not configured", ex.Message);
    }
}
