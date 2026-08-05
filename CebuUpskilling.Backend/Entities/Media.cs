using System.ComponentModel.DataAnnotations;

namespace CebuUpskilling.Backend.Entities;

public class Media
{
    [Key]
    public int MediaId { get; set; }

    public int LessonId { get; set; }

    [Required, MaxLength(500)]
    public string PathFile { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    public double MbSize { get; set; }

    public Lesson Lesson { get; set; } = null!;
}
