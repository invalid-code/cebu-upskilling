namespace CebuUpskilling.Backend.DTOs;

public record DiscussionPostDto(
    Guid PostId,
    string AuthorName,
    string Content,
    DateTime CreatedAt,
    bool IsOwn
);

public record LessonDiscussionResponse(
    Guid LessonId,
    List<DiscussionPostDto> Posts
);

public record CreateDiscussionPostRequest(
    string Content
);