using CebuUpskilling.Backend.DTOs;

namespace CebuUpskilling.Backend.Services;

public interface IMediaService
{
    Task<MediaDto> UploadLessonVideoAsync(int lessonId, IFormFile file, CancellationToken cancellationToken = default);
}
