using CebuUpskilling.Backend.Options;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

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
}
