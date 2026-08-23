namespace CebuUpskilling.Backend.DTOs;

public record CompanySummary(string Name, int JobPostings, int Recruiters);

public record TalentPoolSummary(int TotalLearners, int SkillsTracked, double AvgSkillLevel);

public record JobPostingDto(
    int PostId,
    string Title,
    string? Description,
    string? Location,
    string? SalaryRange,
    string? JobType,
    string? ExperienceLevel,
    bool IsRemote,
    bool IsActive,
    DateTime CreatedAt);

public record SkillDemandDto(
    string SkillName,
    string? Category,
    int RequiredForRoles,
    double AvgRequiredLevel,
    int LearnerCount,
    double? AvgLearnerLevel);

public record BusinessStatsResponse(
    CompanySummary Company,
    TalentPoolSummary TalentPool,
    List<JobPostingDto> JobPostings,
    List<SkillDemandDto> SkillDemand);
