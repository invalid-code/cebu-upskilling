namespace CebuUpskilling.Backend.DTOs;

public record PostRequest(
    string? Title,
    string? Description,
    string? TargetRole,
    string? Location,
    string? SalaryRange,
    string? JobType,
    string? ExperienceLevel,
    string? Requirements,
    string? Benefits,
    bool IsRemote = false,
    DateTime? ExpiresAt = null,
    bool IsActive = true,
    string? CompanyLogoUrl = null
);

public record PostResponse(
    int PostId,
    int CompanyId,
    string CompanyName,
    string Title,
    string? Description,
    string? TargetRole,
    string? Location,
    string? SalaryRange,
    string? JobType,
    string? ExperienceLevel,
    string? Requirements,
    string? Benefits,
    bool IsRemote,
    DateTime? ExpiresAt,
    bool IsActive,
    string? CompanyLogoUrl,
    DateTime CreatedAt
);

public record PostQueryParams(
    string? Search = null,
    string? TargetRole = null,
    string? JobType = null,
    string? Location = null,
    bool? IsRemote = null,
    int? CompanyId = null,
    bool? IsActive = null,
    string? SortBy = "newest",
    int Page = 1,
    int PageSize = 20
);

public record PagedPostsResponse(
    List<PostResponse> Items,
    int Total,
    int Page,
    int PageSize
);