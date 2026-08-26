using System.IO;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using Microsoft.AspNetCore.Http;

namespace CebuUpskilling.Backend.Services;

public class MediaService : IMediaService
{
    private readonly ILessonRepository _lessons;
    private readonly IMediaRepository _media;
    private readonly IObjectStorageService _storage;
    private readonly ILogger<MediaService> _logger;

    public MediaService(
        ILessonRepository lessons,
        IMediaRepository media,
        IObjectStorageService storage,
        ILogger<MediaService> logger)
    {
        _lessons = lessons;
        _media = media;
        _storage = storage;
        _logger = logger;
    }

    public async Task<MediaDto> UploadLessonVideoAsync(int lessonId, IFormFile file, CancellationToken cancellationToken = default)
    {
        var lesson = await _lessons.GetByIdAsync(lessonId);
        if (lesson == null)
            throw new KeyNotFoundException($"Lesson {lessonId} not found");

        var extension = Path.GetExtension(file.FileName);
        var key = $"course-content/{lessonId}/{Guid.NewGuid()}{extension}";

        await using var stream = file.OpenReadStream();
        var publicUrl = await _storage.UploadAsync(key, stream, file.ContentType, cancellationToken);

        var media = new Media
        {
            LessonId = lessonId,
            PathFile = publicUrl,
            Type = file.ContentType,
            MbSize = Math.Round(file.Length / 1024.0 / 1024.0, 2)
        };

        await _media.AddAsync(media, cancellationToken);
        await _media.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Uploaded video for lesson {LessonId} to R2 as {Key}", lessonId, key);

        return new MediaDto(media.MediaId, media.PathFile, media.Type, media.MbSize);
    }

    public async Task<DocumentUploadDto> UploadDocumentAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".pdf", ".doc", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp" };
        if (string.IsNullOrWhiteSpace(extension) || !allowed.Contains(extension))
        {
            throw new InvalidOperationException("Unsupported file type");
        }

        if (file.Length > 10 * 1024 * 1024)
        {
            throw new InvalidOperationException("File must be 10 MB or smaller");
        }

        if (file.Length == 0)
        {
            throw new InvalidOperationException("The uploaded file is empty");
        }

        var key = $"documents/{Guid.NewGuid()}{extension}";
        await using var stream = file.OpenReadStream();
        var publicUrl = await _storage.UploadAsync(key, stream, file.ContentType, cancellationToken);

        _logger.LogInformation("Uploaded document to storage as {Key}", key);
        return new DocumentUploadDto(publicUrl, file.FileName, file.Length);
    }
}
