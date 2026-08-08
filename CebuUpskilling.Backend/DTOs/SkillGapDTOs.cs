namespace CebuUpskilling.Backend.DTOs;

public record SkillGapResponse(
    int SkillId,
    string SkillName,
    string? Category,
    int RequiredLevel,
    int CurrentLevel,
    int Gap,
    bool Verified
);
