using System.Security.Claims;

namespace CebuUpskilling.Backend.Controllers;

/// <summary>
/// Safe accessors for the authenticated user id. Never use
/// <c>int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value)</c> directly:
/// a missing or malformed claim throws (NullReference/FormatException) and
/// surfaces as a 500. These helpers let callers return 401 instead.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public static bool TryGetUserId(this ClaimsPrincipal? user, out int userId)
    {
        userId = 0;
        var raw = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return raw != null && int.TryParse(raw, out userId);
    }
}
