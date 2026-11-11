namespace CebuUpskilling.Backend.DTOs;

public record SkillGapResponse(
    Guid SkillId,
    string SkillName,
    string? Category,
    int RequiredLevel,
    int CurrentLevel,
    int Gap,
    bool Verified
);

public record SkillGapGroupDto(
    string Role,
    string? CompanyName,
    Guid? PostId,
    int MatchPercent,
    List<SkillGapResponse> Gaps
);
