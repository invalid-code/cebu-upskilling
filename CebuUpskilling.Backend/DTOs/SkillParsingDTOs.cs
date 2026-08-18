namespace CebuUpskilling.Backend.DTOs;

public record ParsedSkillResult(
    string SkillName,
    int SkillId,
    int? AssessmentId
);

public record ParseSkillsResult(
    IReadOnlyList<ParsedSkillResult> Skills
);
