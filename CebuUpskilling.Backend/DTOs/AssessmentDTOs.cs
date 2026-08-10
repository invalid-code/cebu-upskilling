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

public record StartAssessmentRequest(int SkillId);

public record StartAssessmentResponse(
    int AssessmentId,
    int SkillId,
    string SkillName,
    int TimeLimitMinutes
);

public record AssessmentQuestionDto(
    int QuestionId,
    string Text,
    List<string> Options
);

public record AssessmentQuestionsResponse(
    int AssessmentId,
    string SkillName,
    int TimeLimitMinutes,
    List<AssessmentQuestionDto> Questions
);

public record SubmitAnswerRequest(int QuestionId, int SelectedOption);

public record SubmitAssessmentRequest(
    List<SubmitAnswerRequest> Answers
);

public record SubmitAssessmentResponse(
    int AssessmentId,
    int SkillId,
    string SkillName,
    int ScorePercent,
    int CorrectAnswers,
    int TotalQuestions,
    int ScoredLevel,
    string LevelLabel,
    bool Verified,
    DateTime CompletedAt
);

public record AvailableAssessmentDto(
    int SkillId,
    string SkillName,
    string? Category,
    int CurrentLevel,
    string CurrentLevelLabel,
    int TargetLevel,
    string TargetLevelLabel,
    int Gap,
    bool HasAssessment,
    int QuestionCount,
    int TimeLimitMinutes
);

public record AvailableAssessmentsResponse(
    List<AvailableAssessmentDto> Assessments,
    int MatchPercent,
    int VerifiedSkillsCount,
    int RecommendedCount
);
