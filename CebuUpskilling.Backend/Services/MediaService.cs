using System.IO;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using Microsoft.AspNetCore.Http;

namespace CebuUpskilling.Backend.Services;

public class MediaService : IMediaService
{
    private const long MaxVideoBytes = 524_288_000;
    private static readonly string[] AllowedVideoExtensions = [".mp4", ".mov", ".webm", ".mkv", ".avi"];

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

        if (file == null || file.Length == 0)
            throw new InvalidOperationException("A video file must be provided");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension) || !AllowedVideoExtensions.Contains(extension))
            throw new InvalidOperationException("Video must be an MP4, MOV, WebM, MKV or AVI file");

        if (file.Length > MaxVideoBytes)
            throw new InvalidOperationException("Video must be 500 MB or smaller");

        // Content signature validation - the controller only checks the
        // client-supplied content-type header, which is trivially spoofed.
        using (var headerStream = file.OpenReadStream())
            ValidateVideoMagicBytes(headerStream);

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
        ValidateDocument(file);

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var key = $"documents/{Guid.NewGuid()}{extension}";
        await using var stream = file.OpenReadStream();
        var publicUrl = await _storage.UploadAsync(key, stream, file.ContentType, cancellationToken);

        _logger.LogInformation("Uploaded document to storage as {Key}", key);
        return new DocumentUploadDto(publicUrl, file.FileName, file.Length);
    }

    public async Task<MediaDto> UploadLessonDocumentAsync(int lessonId, IFormFile file, CancellationToken cancellationToken = default)
    {
        var lesson = await _lessons.GetByIdAsync(lessonId);
        if (lesson == null)
            throw new KeyNotFoundException($"Lesson {lessonId} not found");

        ValidateDocument(file);

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var key = $"lesson-documents/{lessonId}/{Guid.NewGuid()}{extension}";

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

        _logger.LogInformation("Uploaded document for lesson {LessonId} to R2 as {Key}", lessonId, key);

        return new MediaDto(media.MediaId, media.PathFile, media.Type, media.MbSize);
    }

    private static void ValidateDocument(IFormFile file)
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

        // Magic bytes validation - do not trust extension alone.
        // Plain-text formats (.txt/.md) have no signature and are accepted as-is.
        using var stream = file.OpenReadStream();
        ValidateDocumentMagicBytes(stream, extension);
    }

    private static void ValidateDocumentMagicBytes(Stream stream, string extension)
    {
        var header = new byte[12];
        var read = 0;
        while (read < header.Length)
        {
            var n = stream.Read(header, read, header.Length - read);
            if (n == 0) break;
            read += n;
        }

        bool valid = extension switch
        {
            // PDF must start with %PDF-
            ".pdf" => read >= 4
                && header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46,
            // DOCX is a ZIP: starts with PK; legacy DOC is OLE: D0 CF 11 E0
            ".docx" => read >= 2 && header[0] == 0x50 && header[1] == 0x4B,
            ".doc" => read >= 4
                && header[0] == 0xD0 && header[1] == 0xCF && header[2] == 0x11 && header[3] == 0xE0,
            // PNG: 89 50 4E 47 0D 0A 1A 0A
            ".png" => read >= 8
                && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47
                && header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
            // JPEG: FF D8 FF
            ".jpg" or ".jpeg" => read >= 3
                && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            // WEBP: RIFF....WEBP
            ".webp" => read >= 12
                && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
                && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
            _ => true,
        };

        if (!valid)
            throw new InvalidOperationException("File content does not match its type");
    }

    private static void ValidateVideoMagicBytes(Stream stream)
    {
        var header = new byte[12];
        var read = 0;
        while (read < header.Length)
        {
            var n = stream.Read(header, read, header.Length - read);
            if (n == 0) break;
            read += n;
        }

        // MP4/MOV: ....ftyp | WebM/MKV: 1A 45 DF A3 | AVI: RIFF....AVI
        var valid = read >= 12
            && ((header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70)
                || (header[0] == 0x1A && header[1] == 0x45 && header[2] == 0xDF && header[3] == 0xA3)
                || (header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
                    && header[8] == 0x41 && header[9] == 0x56 && header[10] == 0x49 && header[11] == 0x20));

        if (!valid)
            throw new InvalidOperationException("File must be a valid video file");
    }
}
