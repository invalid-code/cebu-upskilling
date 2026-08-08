namespace CebuUpskilling.Backend.DTOs;

public record AssessmentResultResponse(
    int AssessmentId,
    int SkillId,
    string SkillName,
    int ScoredLevel,
    string LevelLabel,
    bool Verified,
    DateTime CompletedAt
);

public record RecommendedAssessmentResponse(
    int SkillId,
    string SkillName,
    string? Category,
    int CurrentLevel,
    string CurrentLevelLabel,
    int TargetLevel,
    string TargetLevelLabel,
    int Gap
);
