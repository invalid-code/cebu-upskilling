using CebuUpskilling.Backend.DTOs;

namespace CebuUpskilling.Backend.Services;

public interface IAssessmentService
{
    Task<List<AssessmentResultResponse>> GetRecentResultsAsync(int userId);
    Task<RecommendedAssessmentResponse?> GetRecommendedAsync(int userId);
    Task<AvailableAssessmentsResponse?> GetAvailableAssessmentsAsync(int userId);
    Task<StartAssessmentResponse?> StartAssessmentAsync(int userId, StartAssessmentRequest request);
    Task<AssessmentQuestionsResponse?> GetQuestionsAsync(int userId, int assessmentId);
    Task<SubmitAssessmentResponse?> SubmitAssessmentAsync(int userId, int assessmentId, SubmitAssessmentRequest request);
    Task<CreatedCompanyQuestionResponse?> CreateCompanyQuestionAsync(int userId, CreateCompanyQuestionRequest request);
}
