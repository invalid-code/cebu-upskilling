namespace CebuUpskilling.Backend.DTOs;

public record ApplicationSummary(
    int PostId,
    string Title,
    string Company,
    string? TargetRole,
    string Status,
    DateTime AppliedAt,
    DateTime? SavedAt,
    string Schedule = "Full-time"
);

public record ApplyRequest(int PostId);

public record UpdateApplicationStatusRequest(string Status);
