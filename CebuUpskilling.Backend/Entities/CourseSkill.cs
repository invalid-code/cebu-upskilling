namespace CebuUpskilling.Backend.Entities;

public class CourseSkill
{
    public int CourseId { get; set; }

    public int SkillId { get; set; }

    public Course Course { get; set; } = null!;

    public Skill Skill { get; set; } = null!;
}
