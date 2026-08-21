namespace CebuUpskilling.Backend.DTOs;

public record RequiredSkillInput(int SkillId, int RequiredLevel);

public record RequiredSkillDto(
    int SkillId,
    string SkillName,
    string? Category,
    int RequiredLevel);