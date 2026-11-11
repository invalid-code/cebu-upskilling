using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class LearnerNote
{
    [Key]
    public Guid LearnerNoteId { get; set; }

    public Guid LearnerId { get; set; }

    public Guid LessonId { get; set; }

    [Required, MaxLength(20000)]
    public string Content { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; }

    public Learner Learner { get; set; } = null!;
    public Lesson Lesson { get; set; } = null!;
}