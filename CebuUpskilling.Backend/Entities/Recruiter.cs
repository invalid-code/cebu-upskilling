using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Recruiter
{
    [Key]
    public int RecruiterId { get; set; }

    public int CompanyId { get; set; }

    public int UserId { get; set; }

    public Company Company { get; set; } = null!;
    public AppUser User { get; set; } = null!;
    public ICollection<Post> Posts { get; set; } = new List<Post>();
}
