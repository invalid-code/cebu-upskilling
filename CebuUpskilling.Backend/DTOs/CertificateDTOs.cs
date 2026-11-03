namespace CebuUpskilling.Backend.DTOs;

/// <summary>
/// A learner's awarded course certificate. The snapshot fields let the
/// certificate remain stable even if the course or profile is later renamed.
/// </summary>
public record CertificateDto(
    Guid CertificateId,
    Guid CourseId,
    string SerialNumber,
    string RecipientName,
    string CourseName,
    string ProviderName,
    DateTime IssuedAt
);
