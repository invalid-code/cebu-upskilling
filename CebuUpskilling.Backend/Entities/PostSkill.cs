namespace CebuUpskilling.Backend.Entities;

public class PostSkill
{
    public int PostId { get; set; }

    public int SkillId { get; set; }

    public int RequiredLevel { get; set; }

    public Post Post { get; set; } = null!;
    public Skill Skill { get; set; } = null!;
}