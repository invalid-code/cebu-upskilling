namespace CebuUpskilling.Backend.Entities;

public class PostCourseRequired
{
    public Guid PostId { get; set; }

    public Guid CourseId { get; set; }

    public Post Post { get; set; } = null!;
    public Course Course { get; set; } = null!;
}
