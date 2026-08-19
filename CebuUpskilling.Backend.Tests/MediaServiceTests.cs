using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

[Trait("Category", "ExternalIntegration")]
public class MediaServiceTests
{
    private sealed class FakeObjectStorage : IObjectStorageService
    {
        public string? UploadedKey { get; private set; }
        public Stream? UploadedStream { get; private set; }
        public string? UploadedContentType { get; private set; }
        public long? UploadedLength { get; private set; }
        public int UploadCount { get; private set; }
        public int DeleteCount { get; private set; }

        public string PublicUrl { get; set; } = "https://media.example.com/course-content/7/abc.mp4";

        public Task<string> UploadAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default)
        {
            UploadedKey = key;
            UploadedStream = content;
            UploadedContentType = contentType;
            UploadedLength = content.Length;
            UploadCount++;
            return Task.FromResult(PublicUrl);
        }

        public Task DeleteAsync(string key, CancellationToken cancellationToken = default)
        {
            DeleteCount++;
            return Task.CompletedTask;
        }

        public string GetPublicUrl(string key) => $"{PublicUrl.TrimEnd('/')}/{key}";
    }

    private sealed class FakeFormFile : IFormFile
    {
        private readonly byte[] _content;

        public FakeFormFile(string fileName, string contentType, byte[] content)
        {
            FileName = fileName;
            ContentType = contentType;
            _content = content;
        }

        public string ContentType { get; }
        public string ContentDisposition => $"form-data; name=\"file\"; filename=\"{FileName}\"";
        public IHeaderDictionary Headers { get; } = new HeaderDictionary();
        public long Length => _content.Length;
        public string Name => "file";
        public string FileName { get; }

        public void CopyTo(Stream target) => target.Write(_content, 0, _content.Length);

        public Task CopyToAsync(Stream target, CancellationToken cancellationToken = default)
        {
            target.Write(_content, 0, _content.Length);
            return Task.CompletedTask;
        }

        public Stream OpenReadStream() => new MemoryStream(_content);
    }

    private static MediaService CreateService(ApplicationDbContext context, IObjectStorageService storage) => new(
        new LessonRepository(context),
        new MediaRepository(context),
        storage,
        NullLogger<MediaService>.Instance
    );

    private static async Task<int> SeedLessonAsync(ApplicationDbContext context)
    {
        var course = new Course { Name = "Web Development" };
        context.Courses.Add(course);
        await context.SaveChangesAsync();

        var module = new CourseModule { CourseId = course.CourseId, Name = "Module 1", Order = 1 };
        context.CourseModules.Add(module);
        await context.SaveChangesAsync();

        var lesson = new Lesson { ModuleId = module.ModuleId, CourseId = course.CourseId, Name = "React Basics" };
        context.Lessons.Add(lesson);
        await context.SaveChangesAsync();

        return lesson.LessonId;
    }

    [Fact]
    public async Task UploadLessonVideoAsync_UploadsToStorageWithLessonKey_AndPersistsMedia()
    {
        var context = TestDbContextFactory.Create();
        var lessonId = await SeedLessonAsync(context);
        var storage = new FakeObjectStorage();
        var service = CreateService(context, storage);

        var bytes = new byte[1024 * 1024 * 5]; // 5 MB
        var result = await service.UploadLessonVideoAsync(lessonId, new FakeFormFile("lesson.mp4", "video/mp4", bytes));

        Assert.Equal("https://media.example.com/course-content/7/abc.mp4", result.PathFile);
        Assert.Equal("video/mp4", result.Type);
        Assert.Equal(Math.Round(5.0, 2), result.MbSize);

        Assert.Equal(1, storage.UploadCount);
        Assert.NotNull(storage.UploadedKey);
        Assert.StartsWith($"course-content/{lessonId}/", storage.UploadedKey);
        Assert.EndsWith(".mp4", storage.UploadedKey);
        Assert.Equal("video/mp4", storage.UploadedContentType);
        Assert.Equal(bytes.Length, storage.UploadedLength);

        var stored = await context.Media.SingleAsync(m => m.LessonId == lessonId);
        Assert.Equal(result.PathFile, stored.PathFile);
        Assert.Equal("video/mp4", stored.Type);
        Assert.Equal(result.MbSize, stored.MbSize);
    }

    [Fact]
    public async Task UploadLessonVideoAsync_GeneratesUniqueKeyPerUpload()
    {
        var context = TestDbContextFactory.Create();
        var lessonId = await SeedLessonAsync(context);
        var storage = new FakeObjectStorage();
        var service = CreateService(context, storage);
        var bytes = new byte[10];

        await service.UploadLessonVideoAsync(lessonId, new FakeFormFile("a.mp4", "video/mp4", bytes));
        var firstKey = storage.UploadedKey;
        await service.UploadLessonVideoAsync(lessonId, new FakeFormFile("b.mp4", "video/mp4", bytes));
        var secondKey = storage.UploadedKey;

        Assert.NotEqual(firstKey, secondKey);
        Assert.Equal(2, storage.UploadCount);
        Assert.Equal(2, await context.Media.CountAsync(m => m.LessonId == lessonId));
    }

    [Fact]
    public async Task UploadLessonVideoAsync_UnknownLesson_ThrowsKeyNotFound_WithoutUpload()
    {
        var context = TestDbContextFactory.Create();
        var storage = new FakeObjectStorage();
        var service = CreateService(context, storage);

        var ex = await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.UploadLessonVideoAsync(999, new FakeFormFile("lesson.mp4", "video/mp4", new byte[10])));

        Assert.Contains("Lesson 999 not found", ex.Message);
        Assert.Equal(0, storage.UploadCount);
        Assert.Empty(context.Media);
    }
}
