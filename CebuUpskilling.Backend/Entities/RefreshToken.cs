using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

/// <summary>
/// Opaque refresh token stored as a SHA-256 hash (raw value is only ever
/// returned once at issuance/rotation). One row per device/session; rotation
/// revokes the old row and links it via <see cref="ReplacedByHash"/> so reuse
/// of a rotated token can be detected as theft.
/// </summary>
public class RefreshToken
{
    [Key]
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    [Required, MaxLength(64)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    [MaxLength(64)]
    public string? ReplacedByHash { get; set; }

    public AppUser? User { get; set; }
}
