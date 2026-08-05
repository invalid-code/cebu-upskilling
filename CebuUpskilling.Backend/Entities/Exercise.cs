using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Exercise
{
    [Key]
    public int ExerciseId { get; set; }

    public int LessonId { get; set; }

    [Required, MaxLength(100)]
    public string Type { get; set; } = string.Empty;

    public int? ExerciseContentId { get; set; }

    public string? AnswerKey { get; set; }

    public Lesson Lesson { get; set; } = null!;
    public ExerciseContent? ExerciseContent { get; set; }
}
