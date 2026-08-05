using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class LessonContent
{
    [Key]
    public int ContentId { get; set; }

    public int LessonId { get; set; }

    [Required, MaxLength(100)]
    public string BlockType { get; set; } = string.Empty;

    public string? Content { get; set; }

    public int PercentAddedPerContent { get; set; }

    public int LessonOrder { get; set; }

    public int TopicOrder { get; set; }

    public Lesson Lesson { get; set; } = null!;
}
