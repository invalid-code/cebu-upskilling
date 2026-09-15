namespace CebuUpskilling.Backend.DTOs;

public record SkillTrendDto(
    int SkillId,
    string SkillName,
    string? Category,
    int ActivePostings,
    int TotalPostings,
    double AvgRequiredLevel,
    DateTime UpdatedAt);

public record RoleTrendDto(
    string TargetRole,
    int ActivePostings,
    int TotalPostings,
    DateTime UpdatedAt);

public record MarketTrendsResponse(
    List<SkillTrendDto> Skills,
    List<RoleTrendDto> Roles);
