namespace CebuUpskilling.Backend.Entities;

public class PostSkill
{
    public Guid PostId { get; set; }

    public Guid SkillId { get; set; }

    public int RequiredLevel { get; set; }

    public Post Post { get; set; } = null!;
    public Skill Skill { get; set; } = null!;
}