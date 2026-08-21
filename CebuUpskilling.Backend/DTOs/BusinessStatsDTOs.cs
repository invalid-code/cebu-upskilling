namespace CebuUpskilling.Backend.DTOs;

public record CompanySummary(int CompanyId, int RecruiterId, string Name, int JobPostings, int Recruiters);

public record TalentPoolSummary(int TotalLearners, int SkillsTracked, double AvgSkillLevel);

public record RequiredCourseDto(int CourseId, string Name, string Discipline, int TechnicalLevel, string Mode);

public record JobPostingDto(
    int PostId,
    string Title,
    string? Description,
    string Schedule,
    List<RequiredCourseDto> RequiredCourses,
    List<RequiredSkillDto> RequiredSkills);

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
