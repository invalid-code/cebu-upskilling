using CebuUpskilling.Backend.DTOs;

namespace CebuUpskilling.Backend.Services;

public interface IAssessmentService
{
    Task<List<AssessmentResultResponse>> GetRecentResultsAsync(Guid userId);
    Task<RecommendedAssessmentResponse?> GetRecommendedAsync(Guid userId);
    Task<AvailableAssessmentsResponse?> GetAvailableAssessmentsAsync(Guid userId);
    Task<StartAssessmentResponse?> StartAssessmentAsync(Guid userId, StartAssessmentRequest request);
    Task<AssessmentQuestionsResponse?> GetQuestionsAsync(Guid userId, Guid assessmentId);
    Task<SubmitAssessmentResponse?> SubmitAssessmentAsync(Guid userId, Guid assessmentId, SubmitAssessmentRequest request);
    Task<CreatedCompanyQuestionResponse?> CreateCompanyQuestionAsync(Guid userId, CreateCompanyQuestionRequest request);
    Task<CreatedProviderQuestionResponse?> CreateProviderQuestionAsync(Guid userId, CreateProviderQuestionRequest request);
    Task<int> EnsureQuestionsForSkillAsync(Guid skillId, CancellationToken ct = default);
}
