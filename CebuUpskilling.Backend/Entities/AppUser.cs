using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CebuUpskilling.Backend.Entities;

public class AppUser : AuditableEntity
{
    [Key]
    public int UserId { get; set; }

    [Required, MaxLength(255)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? MiddleName { get; set; }

    public DateTime? Birthday { get; set; }

    [Required, MaxLength(255)]
    public string EmailAddress { get; set; } = string.Empty;

    // Nullable: users who only ever sign in with Google have no local password.
    [MaxLength(500)]
    [JsonIgnore]
    public string? PasswordHash { get; set; }

    [MaxLength(50)]
    public string Role { get; set; } = "Learner";

    [MaxLength(100)]
    public string? TargetRole { get; set; }

    [MaxLength(255)]
    public string? Address { get; set; }

    [MaxLength(255)]
    public string? Street { get; set; }

    [MaxLength(255)]
    public string? City { get; set; }

    [MaxLength(255)]
    public string? Province { get; set; }

    [MaxLength(20)]
    public string? ZipCode { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    public bool RemoteFriendly { get; set; } = true;

    public bool EmailConfirmed { get; set; }

    [MaxLength(64)]
    public string? EmailConfirmationTokenHash { get; set; }

    public DateTime? EmailConfirmationTokenExpiry { get; set; }

    [MaxLength(64)]
    public string? PasswordResetTokenHash { get; set; }

    public DateTime? PasswordResetTokenExpiry { get; set; }

    public int? CompanyId { get; set; }

    [MaxLength(1000)]
    public string? ResumeUrl { get; set; }

    public Company? Company { get; set; }
    public Learner? Learner { get; set; }
}
