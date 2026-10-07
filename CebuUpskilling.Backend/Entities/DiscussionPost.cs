using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class DiscussionPost
{
    [Key]
    public Guid DiscussionPostId { get; set; }

    public Guid LessonId { get; set; }

    public Guid LearnerId { get; set; }

    [Required, MaxLength(255)]
    public string AuthorName { get; set; } = string.Empty;

    [Required, MaxLength(4000)]
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public Lesson Lesson { get; set; } = null!;
    public Learner Learner { get; set; } = null!;
}