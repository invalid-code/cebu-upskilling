using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CebuUpskilling.Backend.Entities;

public class AssessmentQuestion
{
    [Key]
    public Guid AssessmentQuestionId { get; set; }

    public Guid SkillId { get; set; }

    [Required]
    public string Text { get; set; } = string.Empty;

    [Required]
    public string OptionA { get; set; } = string.Empty;

    [Required]
    public string OptionB { get; set; } = string.Empty;

    [Required]
    public string OptionC { get; set; } = string.Empty;

    [Required]
    public string OptionD { get; set; } = string.Empty;

    public int CorrectOption { get; set; }

    public AssessmentSource Source { get; set; } = AssessmentSource.AI;

    public Guid? CompanyId { get; set; }

    [NotMapped]
    public List<string> Options => new() { OptionA, OptionB, OptionC, OptionD };

    public Skill Skill { get; set; } = null!;
    public Company? Company { get; set; }
}
