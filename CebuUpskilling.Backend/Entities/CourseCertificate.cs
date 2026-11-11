using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

/// <summary>
/// A certificate awarded to a learner when they complete a course whose
/// provider opted in to issuing certificates. Course and recipient details
/// are snapshotted at issuance so later profile or catalog edits do not
/// rewrite an already-awarded credential.
/// </summary>
public class CourseCertificate
{
    [Key]
    public Guid CertificateId { get; set; }

    public Guid CourseId { get; set; }

    public Guid LearnerId { get; set; }

    [Required, MaxLength(64)]
    public string SerialNumber { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string RecipientName { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string CourseName { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string ProviderName { get; set; } = string.Empty;

    public DateTime IssuedAt { get; set; }

    public Course Course { get; set; } = null!;
    public Learner Learner { get; set; } = null!;
}
