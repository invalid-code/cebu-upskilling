namespace CebuUpskilling.Backend.DTOs;

public record AssessmentResultResponse(
    Guid AssessmentId,
    Guid SkillId,
    string SkillName,
    int ScoredLevel,
    string LevelLabel,
    bool Verified,
    DateTime CompletedAt
);

public record RecommendedAssessmentResponse(
    Guid SkillId,
    string SkillName,
    string? Category,
    int CurrentLevel,
    string CurrentLevelLabel,
    int TargetLevel,
    string TargetLevelLabel,
    int Gap
);

public record StartAssessmentRequest(Guid SkillId);

public record StartAssessmentResponse(
    Guid AssessmentId,
    Guid SkillId,
    string SkillName,
    int TimeLimitMinutes
);

public record AssessmentQuestionDto(
    Guid QuestionId,
    string Text,
    List<string> Options,
    string Source,
    string? CompanyName
);

public record AssessmentQuestionsResponse(
    Guid AssessmentId,
    string SkillName,
    int TimeLimitMinutes,
    List<AssessmentQuestionDto> Questions,
    string Source,
    string? CompanyName,
    bool Proctored
);

public record SubmitAnswerRequest(Guid QuestionId, int SelectedOption);

public record SubmitAssessmentRequest(
    List<SubmitAnswerRequest> Answers
);

public record SubmitAssessmentResponse(
    Guid AssessmentId,
    Guid SkillId,
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
    Guid SkillId,
    string SkillName,
    string? Category,
    int CurrentLevel,
    string CurrentLevelLabel,
    int TargetLevel,
    string TargetLevelLabel,
    int Gap,
    bool HasAssessment,
    int QuestionCount,
    int TimeLimitMinutes,
    string SourceLabel,
    string? CompanyName,
    bool Proctored,
    bool IsSkillAssessment
);

public record AvailableAssessmentsResponse(
    List<AvailableAssessmentDto> Assessments,
    int MatchPercent,
    int VerifiedSkillsCount,
    int RecommendedCount
);

public record GeneratedAssessmentQuestion(
    string Text,
    string OptionA,
    string OptionB,
    string OptionC,
    string OptionD,
    int CorrectOption
);

public record CreateCompanyQuestionRequest(
    Guid SkillId,
    string Text,
    string OptionA,
    string OptionB,
    string OptionC,
    string OptionD,
    int CorrectOption
);

public record CreatedCompanyQuestionResponse(
    Guid QuestionId,
    Guid SkillId,
    string Text,
    string Source,
    string CompanyName
);

public record CreateProviderQuestionRequest(
    Guid SkillId,
    string Text,
    string OptionA,
    string OptionB,
    string OptionC,
    string OptionD,
    int CorrectOption
);

public record CreatedProviderQuestionResponse(
    Guid QuestionId,
    Guid SkillId,
    string Text,
    string Source
);

public record LogIntegrityEventRequest(
    string EventType,
    string? Detail
);
