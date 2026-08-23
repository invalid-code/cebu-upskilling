using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class LearnerNote
{
    [Key]
    public int LearnerNoteId { get; set; }

    public int LearnerId { get; set; }

    public int LessonId { get; set; }

    [Required, MaxLength(20000)]
    public string Content { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; }

    public Learner Learner { get; set; } = null!;
    public Lesson Lesson { get; set; } = null!;
}