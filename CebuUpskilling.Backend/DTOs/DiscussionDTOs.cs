namespace CebuUpskilling.Backend.DTOs;

public record DiscussionPostDto(
    int PostId,
    string AuthorName,
    string Content,
    DateTime CreatedAt,
    bool IsOwn
);

public record LessonDiscussionResponse(
    int LessonId,
    List<DiscussionPostDto> Posts
);

public record CreateDiscussionPostRequest(
    string Content
);