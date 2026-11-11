using CebuUpskilling.Backend.DTOs;

namespace CebuUpskilling.Backend.Services;

public interface IMediaService
{
    Task<MediaDto> UploadLessonVideoAsync(Guid lessonId, IFormFile file, CancellationToken cancellationToken = default);
    Task<DocumentUploadDto> UploadDocumentAsync(IFormFile file, CancellationToken cancellationToken = default);
    Task<MediaDto> UploadLessonDocumentAsync(Guid lessonId, IFormFile file, CancellationToken cancellationToken = default);
}
