using System.ComponentModel.DataAnnotations;

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

    [Required, MaxLength(500)]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Role { get; set; } = "Learner";

    public Learner? Learner { get; set; }
    public Recruiter? Recruiter { get; set; }
}
