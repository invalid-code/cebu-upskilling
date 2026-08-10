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

    // ------------------------------------------------------------------ //
    // Registration hardening
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Register_WithDisallowedRole_IsRejected()
    {
        var response = await RegisterAsync(new
        {
            firstName = "Jose",
            lastName = "Rizal",
            emailAddress = "sec.admin@example.com",
            password = "P@ssw0rd!",
            role = "Admin",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Contains("not allowed", body.GetProperty("error").GetString());

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
        Assert.Equal(7, gapsB.Count);
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
    // Learner profile exposure
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task LearnerCollection_ReturnsOnlyTheCallersOwnProfile()
    {
        var (tokenA, _) = await RegisterUserAsync("sec.pii.a@example.com");
        await RegisterUserAsync("sec.pii.b@example.com");

        var response = await AuthorizedClient(tokenA).GetAsync("/api/learners");
        response.EnsureSuccessStatusCode();

        var raw = await response.Content.ReadAsStringAsync();
        var learners = (JsonDocument.Parse(raw).RootElement).EnumerateArray().ToList();

        Assert.Single(learners);
        Assert.Equal("sec.pii.a@example.com", learners[0].GetProperty("user").GetProperty("emailAddress").GetString());
        Assert.DoesNotContain("sec.pii.b@example.com", raw);
        Assert.DoesNotContain("passwordHash", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task LearnerProfile_OfAnotherUser_IsNotAccessibleById()
    {
        var (tokenA, _) = await RegisterUserAsync("sec.pii.c@example.com");
        var (_, userIdB) = await RegisterUserAsync("sec.pii.d@example.com");
        var learnerIdB = await GetLearnerIdAsync(userIdB);

        var response = await AuthorizedClient(tokenA).GetAsync($"/api/learners/{learnerIdB}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task LearnerProfile_OwnProfile_IsAccessible()
    {
        var (tokenA, userIdA) = await RegisterUserAsync("sec.pii.e@example.com");
        var learnerIdA = await GetLearnerIdAsync(userIdA);

        var response = await AuthorizedClient(tokenA).GetAsync($"/api/learners/{learnerIdA}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("sec.pii.e@example.com", body.GetProperty("user").GetProperty("emailAddress").GetString());
    }

    [Fact]
    public async Task LearnerProfile_CannotBeCreatedForAnotherUser()
    {
        var (tokenA, _) = await RegisterUserAsync("sec.pii.f@example.com");
        var (_, userIdB) = await RegisterUserAsync("sec.pii.g@example.com");

        var response = await AuthorizedClient(tokenA).PostAsJsonAsync("/api/learners", new
        {
            userId = userIdB,
            isPremium = false,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/disciplines");
        request.Headers.Add("Origin", "http://localhost:5173");

        var response = await Client.SendAsync(request);

        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values));
        Assert.Equal("http://localhost:5173", values.Single());
    }

    [Fact]
    public async Task Cors_DisallowedOrigin_IsNotReflected()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/disciplines");
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
            claims: new[] { new Claim(ClaimTypes.Email, "sec.err@example.com") },
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
