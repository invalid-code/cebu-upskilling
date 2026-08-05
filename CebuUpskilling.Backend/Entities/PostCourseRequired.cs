namespace CebuUpskilling.Backend.Entities;

public class PostCourseRequired
{
    public int PostId { get; set; }

    public int CourseId { get; set; }

    public Post Post { get; set; } = null!;
    public Course Course { get; set; } = null!;
}
