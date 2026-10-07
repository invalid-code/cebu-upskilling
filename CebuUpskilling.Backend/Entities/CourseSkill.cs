namespace CebuUpskilling.Backend.Entities;

public class CourseSkill
{
    public Guid CourseId { get; set; }

    public Guid SkillId { get; set; }

    public Course Course { get; set; } = null!;

    public Skill Skill { get; set; } = null!;
}
