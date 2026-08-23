using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Security-focused integration tests running against the real HTTP pipeline
/// and a real PostgreSQL test database: JWT hardening, credential handling,
/// object-level authorization, CORS, injection, and data exposure.
/// </summary>
public class SecurityApiTests : ProductionApiTestBase
{
    public SecurityApiTests(ProductionApiFactory factory) : base(factory) { }

    private (string Key, string Issuer, string Audience) JwtConfig()
    {
        var config = Factory.Services.GetRequiredService<IConfiguration>();
        return (config["Jwt:Key"]!, config["Jwt:Issuer"]!, config["Jwt:Audience"]!);
    }

    private static string ForgeToken(string signingKey, string issuer, string audience, int userId, DateTime? expires = null)
    {
        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) },
            expires: expires ?? DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);
        return handler.WriteToken(token);
    }

    private static string MakeUnsignedToken(string header, string payload)
    {
        static string Base64Url(string s) =>
            Convert.ToBase64String(Encoding.UTF8.GetBytes(s)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        return $"{Base64Url(header)}.{Base64Url(payload)}.";
    }

    private async Task<(string Token, int UserId)> RegisterUserAsync(string email, string role = "Learner", string? targetRole = null)
    {
        var response = await RegisterAsync(new
        {
            firstName = "Jose",
            lastName = "Rizal",
            emailAddress = email,
            password = "P@ssw0rd!",
            role,
            targetRole,
            resume = role == "Learner" ? "Experienced software developer." : null,
        });
        response.EnsureSuccessStatusCode();
        var body = await ReadJsonAsync(response);
        return (body.GetProperty("token").GetString()!, body.GetProperty("userId").GetInt32());
    }

    private async Task<int> GetLearnerIdAsync(int userId)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return (await db.Learners.SingleAsync(l => l.UserId == userId)).LearnerId;
    }

    // ------------------------------------------------------------------ //
    // Authentication / JWT validation
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task ProtectedEndpoint_NoToken_ReturnsUnauthorized()
    {
        var response = await Client.GetAsync("/api/skillgaps");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_MalformedBearerToken_ReturnsUnauthorized()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/skillgaps");
        request.Headers.Authorization = new("Bearer", "this.is.not.a.jwt");

        var response = await Client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_TokenWithoutBearerScheme_ReturnsUnauthorized()
    {
        var (_, issuer, audience) = JwtConfig();
        var raw = ForgeToken(JwtConfig().Key, issuer, audience, userId: 1);

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/skillgaps");
        request.Headers.Add("Authorization", raw);

        var response = await Client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_TokenSignedWithWrongKey_ReturnsUnauthorized()
    {
        var (_, issuer, audience) = JwtConfig();
        var token = ForgeToken("a-completely-different-signing-key-at-least-32-chars", issuer, audience, userId: 1);

        var response = await AuthorizedClient(token).GetAsync("/api/skillgaps");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_TokenWithWrongIssuer_ReturnsUnauthorized()
    {
        var (key, _, audience) = JwtConfig();
        var token = ForgeToken(key, "EvilIssuer", audience, userId: 1);

        var response = await AuthorizedClient(token).GetAsync("/api/skillgaps");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_TokenWithWrongAudience_ReturnsUnauthorized()
    {
        var (key, issuer, _) = JwtConfig();
        var token = ForgeToken(key, issuer, "EvilAudience", userId: 1);

        var response = await AuthorizedClient(token).GetAsync("/api/skillgaps");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_ExpiredToken_ReturnsUnauthorized()
    {
        var (key, issuer, audience) = JwtConfig();
        var token = ForgeToken(key, issuer, audience, userId: 1, expires: DateTime.UtcNow.AddHours(-1));

        var response = await AuthorizedClient(token).GetAsync("/api/skillgaps");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_AlgNoneToken_ReturnsUnauthorized()
    {
        var token = MakeUnsignedToken(
            "{\"alg\":\"none\",\"typ\":\"JWT\"}",
            "{\"sub\":\"1\",\"email\":\"sec.algnone@example.com\",\"role\":\"Learner\"}");

        var response = await AuthorizedClient(token).GetAsync("/api/skillgaps");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_TokenNotYetValid_ReturnsUnauthorized()
    {
        var (key, issuer, audience) = JwtConfig();
        var handler = new JwtSecurityTokenHandler();
        var token = handler.WriteToken(new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: new[] { new Claim(ClaimTypes.NameIdentifier, "1") },
            notBefore: DateTime.UtcNow.AddHours(1),
            expires: DateTime.UtcNow.AddDays(1),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                SecurityAlgorithms.HmacSha256)));

        var response = await AuthorizedClient(token).GetAsync("/api/skillgaps");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_TamperedToken_ReturnsUnauthorized()
    {
        var (key, issuer, audience) = JwtConfig();
        var valid = ForgeToken(key, issuer, audience, userId: 1);
        var parts = valid.Split('.');
        var tamperedPayload = string.Concat(parts[1].AsSpan(0, parts[1].Length - 4), "AAAA");
        var tampered = $"{parts[0]}.{tamperedPayload}.{parts[2]}";

        var response = await AuthorizedClient(tampered).GetAsync("/api/skillgaps");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Registration hardening
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Register_WithDisallowedRole_IsRejected()
    {
        var response = await RegisterAsync(new
        {
            firstName = "Jose",
            lastName = "Riz",
            emailAddress = "sec.admin@example.com",
            password = "P@ssw0rd!",
            role = "Admin",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var login = await LoginAsync(new { emailAddress = "sec.admin@example.com", password = "P@ssw0rd!" });
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task Register_WithRecruiterRole_IsAllowed()
    {
        var response = await RegisterAsync(new
        {
            firstName = "Maria",
            lastName = "Clara",
            emailAddress = "sec.recruiter@example.com",
            password = "P@ssw0rd!",
            role = "Recruiter",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Recruiter", body.GetProperty("role").GetString());
    }

    [Fact]
    public async Task Register_WeakPassword_IsRejected()
    {
        var response = await RegisterAsync(new
        {
            firstName = "Jose",
            lastName = "Rizal",
            emailAddress = "sec.weakpass@example.com",
            password = "12345",
            role = "Learner",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var login = await LoginAsync(new { emailAddress = "sec.weakpass@example.com", password = "12345" });
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task Register_MissingRequiredFields_ReturnsBadRequest()
    {
        var response = await RegisterAsync(new
        {
            firstName = "Jose",
            emailAddress = "sec.missing@example.com",
            password = "P@ssw0rd!",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Credential storage and disclosure
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Passwords_AreStoredAsBcryptHashes()
    {
        var (_, userId) = await RegisterUserAsync("sec.hash@example.com");

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.SingleAsync(u => u.UserId == userId);

        Assert.StartsWith("$2", user.PasswordHash);
        Assert.NotEqual("P@ssw0rd!", user.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("P@ssw0rd!", user.PasswordHash));
    }

    [Fact]
    public async Task RegisterResponse_DoesNotExposePasswordHash()
    {
        var response = await RegisterAsync(new
        {
            firstName = "Jose",
            lastName = "Rizal",
            emailAddress = "sec.nohash@example.com",
            password = "P@ssw0rd!",
            role = "Learner",
            resume = "Experienced software developer.",
        });

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("passwordHash", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task LoginResponse_DoesNotExposePasswordHash()
    {
        var email = "sec.nohashlogin@example.com";
        await RegisterUserAsync(email);

        var response = await LoginAsync(new { emailAddress = email, password = "P@ssw0rd!" });

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("passwordHash", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_UnknownEmail_And_WrongPassword_ReturnIdenticalErrors()
    {
        await RegisterUserAsync("sec.uniform@example.com");

        var unknown = await LoginAsync(new { emailAddress = "sec.ghost@example.com", password = "P@ssw0rd!" });
        var wrong = await LoginAsync(new { emailAddress = "sec.uniform@example.com", password = "wrong-password" });

        Assert.Equal(unknown.StatusCode, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);

        var unknownBody = await unknown.Content.ReadAsStringAsync();
        var wrongBody = await wrong.Content.ReadAsStringAsync();
        Assert.Equal(unknownBody, wrongBody);
    }

    // ------------------------------------------------------------------ //
    // Object-level authorization (IDOR)
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task SkillGaps_AreScopedToTheCaller()
    {
        var (tokenA, _) = await RegisterUserAsync("sec.gaps.a@example.com");
        var (tokenB, _) = await RegisterUserAsync("sec.gaps.b@example.com", targetRole: "Frontend Developer");

        var gapsA = (await ReadJsonAsync(await AuthorizedClient(tokenA).GetAsync("/api/skillgaps"))).EnumerateArray().ToList();
        var gapsB = (await ReadJsonAsync(await AuthorizedClient(tokenB).GetAsync("/api/skillgaps"))).EnumerateArray().ToList();

        Assert.Empty(gapsA);
        var groupB = Assert.Single(gapsB);
        Assert.Equal(7, groupB.GetProperty("gaps").GetArrayLength());
    }

    [Fact]
    public async Task UserAccounts_ListEndpoint_IsNotExposed()
    {
        var (token, _) = await RegisterUserAsync("sec.authlist@example.com", targetRole: "Frontend Developer");

        var response = await AuthorizedClient(token).GetAsync("/api/auth");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UserAccounts_GetOtherUserById_IsNotExposed()
    {
        var (_, otherUserId) = await RegisterUserAsync("sec.otheraccount@example.com", targetRole: "Frontend Developer");
        var (token, _) = await RegisterUserAsync("sec.autheidor@example.com");

        var response = await AuthorizedClient(token).GetAsync($"/api/auth/{otherUserId}");

        // IDOR protection: an authenticated user must not be able to read another
        // user's account record (email, address, token hashes).
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UserAccounts_UpdateAnotherUser_IsNotExposed()
    {
        var (_, otherUserId) = await RegisterUserAsync("sec.otheraccountput@example.com", targetRole: "Frontend Developer");
        var (token, _) = await RegisterUserAsync("sec.autheidorput@example.com");

        var response = await AuthorizedClient(token).PutAsJsonAsync($"/api/auth/{otherUserId}", new
        {
            Role = "Admin",
        });

        // A caller must not be able to modify (or escalate) another user's account.
        // Either the disabled endpoint (NotFound) or validation rejection (BadRequest)
        // is acceptable; the write must never succeed.
        Assert.NotEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UserAccounts_RawCreateEndpoint_IsNotExposed()
    {
        var (token, _) = await RegisterUserAsync("sec.authrawcreate@example.com");

        var response = await AuthorizedClient(token).PostAsJsonAsync("/api/auth", new
        {
            FirstName = "Sneaky",
            EmailAddress = "sneaky@example.com",
            Role = "Admin",
        });

        // Raw AppUser creation (which would bypass password hashing) is disabled.
        Assert.NotEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AssessmentResults_AreScopedToTheCaller()
    {
        var (tokenA, _) = await RegisterUserAsync("sec.results.a@example.com");
        var (tokenB, userIdB) = await RegisterUserAsync("sec.results.b@example.com");
        var learnerIdB = await GetLearnerIdAsync(userIdB);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.LearnerAssessments.Add(new LearnerAssessment
            {
                LearnerId = learnerIdB,
                SkillId = 1,
                ScoredLevel = 4,
                Verified = true,
                CompletedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        var resultsA = (await ReadJsonAsync(await AuthorizedClient(tokenA).GetAsync("/api/assessments/results"))).EnumerateArray().ToList();
        var resultsB = (await ReadJsonAsync(await AuthorizedClient(tokenB).GetAsync("/api/assessments/results"))).EnumerateArray().ToList();

        Assert.Empty(resultsA);
        Assert.Single(resultsB);
    }

    [Fact]
    public async Task Enrollments_AreScopedToTheCaller()
    {
        var (tokenA, _) = await RegisterUserAsync("sec.enroll.a@example.com");
        var (tokenB, _) = await RegisterUserAsync("sec.enroll.b@example.com");
        var courseId = await CreateCourseAsync(tokenB);

        var enrollB = await AuthorizedClient(tokenB).PostAsJsonAsync("/api/enrollments", new { courseId });
        Assert.Equal(HttpStatusCode.Created, enrollB.StatusCode);

        var enrollmentsA = (await ReadJsonAsync(await AuthorizedClient(tokenA).GetAsync("/api/enrollments"))).EnumerateArray().ToList();
        var enrollmentsB = (await ReadJsonAsync(await AuthorizedClient(tokenB).GetAsync("/api/enrollments"))).EnumerateArray().ToList();

        Assert.Empty(enrollmentsA);
        Assert.Single(enrollmentsB);
    }

    // ------------------------------------------------------------------ //
    // Injection
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task SqlInjection_LoginAttempt_CannotBypassAuthentication()
    {
        var response = await LoginAsync(new
        {
            emailAddress = "admin' OR '1'='1",
            password = "anything",
        });

        // FluentValidation rejects the malformed email address before authentication
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SqlInjection_EmailContainingSqlMetacharacters_IsStoredAsLiteral()
    {
        var literal = "sec.inject'@example.com";
        var response = await RegisterAsync(new
        {
            firstName = "Jose",
            lastName = "Rizal",
            emailAddress = literal,
            password = "P@ssw0rd!",
            role = "Learner",
            resume = "Experienced software developer.",
        });
        response.EnsureSuccessStatusCode();

        var login = await LoginAsync(new { emailAddress = literal, password = "P@ssw0rd!" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // CORS
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Cors_AllowedOrigin_IsReflected()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/courses");
        request.Headers.Add("Origin", "http://localhost:5173");

        var response = await Client.SendAsync(request);

        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values));
        Assert.Equal("http://localhost:5173", values.Single());
    }

    [Fact]
    public async Task Cors_DisallowedOrigin_IsNotReflected()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/courses");
        request.Headers.Add("Origin", "https://evil.example.com");

        var response = await Client.SendAsync(request);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Cors_Preflight_FromAllowedOrigin_IsPermitted()
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/auth/register");
        request.Headers.Add("Origin", "http://localhost:5173");
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "content-type");

        var response = await Client.SendAsync(request);

        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values));
        Assert.Contains("http://localhost:5173", values);
    }

    [Fact]
    public async Task Cors_Preflight_FromDisallowedOrigin_IsNotPermitted()
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/auth/register");
        request.Headers.Add("Origin", "https://evil.example.com");
        request.Headers.Add("Access-Control-Request-Method", "POST");

        var response = await Client.SendAsync(request);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    // ------------------------------------------------------------------ //
    // Error handling
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task ServerError_ReturnsGenericMessageWithoutStackTrace()
    {
        // A validly-signed token that omits the NameIdentifier claim causes the
        // stats endpoint to throw an unhandled NullReferenceException (500).
        var (key, issuer, audience) = JwtConfig();
        var handler = new JwtSecurityTokenHandler();
        var token = handler.WriteToken(new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: new[]
            {
                new Claim(ClaimTypes.Email, "sec.err@example.com"),
                new Claim(ClaimTypes.Role, "Learner"),
            },
            expires: DateTime.UtcNow.AddDays(1),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                SecurityAlgorithms.HmacSha256)));

        var response = await AuthorizedClient(token).GetAsync("/api/stats/week");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Exception", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Stack", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("System.", body, StringComparison.OrdinalIgnoreCase);

        var json = await ReadJsonAsync(response);
        Assert.Equal("An unexpected error occurred", json.GetProperty("error").GetString());
    }
}
