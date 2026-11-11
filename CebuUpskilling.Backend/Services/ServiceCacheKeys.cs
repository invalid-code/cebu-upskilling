using System.Security.Cryptography;
using System.Text;

namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Deterministic IMemoryCache keys shared by producers and (future) evictors.
/// Per-user keys embed the user id so callers never share entries.
/// </summary>
public static class ServiceCacheKeys
{
    public const string MarketTrendsGeneration = "svc:trends:gen";

    public static string MarketTrends(int generation, int top) => $"svc:trends:g{generation}:top:{top}";

    public static string SkillGaps(Guid userId) => $"svc:gaps:user:{userId:N}";

    public static string LearningPathway(Guid userId) => $"svc:pathway:user:{userId:N}";

    public static string CoursesPage(Guid userId, string? category)
    {
        var cat = string.IsNullOrWhiteSpace(category) ? "all" : category.Trim().ToLowerInvariant();
        return $"svc:coursespage:user:{userId:N}:cat:{cat}";
    }

    public static string WeeklyStats(Guid userId) => $"svc:stats:week:user:{userId:N}";

    public static string GeminiResumeSkills(string resumeHash) => $"svc:gemini:resume:{resumeHash}";

    public static string GeminiCourseOutline(string contextHash) => $"svc:gemini:course:{contextHash}";

    /// <summary>SHA-256 hex of an input string (used to bound key length for large prompts).</summary>
    public static string Sha256(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
