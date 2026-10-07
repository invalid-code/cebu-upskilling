using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class ExerciseContent
{
    [Key]
    public Guid ExerciseContentId { get; set; }

    public Guid ExerciseId { get; set; }

    [Required, MaxLength(100)]
    public string BlockType { get; set; } = string.Empty;

    public string? Content { get; set; }

    public double MbSize { get; set; }

    public Exercise Exercise { get; set; } = null!;
}
