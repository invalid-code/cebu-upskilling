namespace CebuUpskilling.Backend.DTOs;

public record ApplicationSummary(
    int PostId,
    string Title,
    string Company,
    string Status,
    DateTime AppliedAt,
    DateTime? SavedAt
);

public record ApplyRequest(int PostId);

public record UpdateApplicationStatusRequest(string Status);
