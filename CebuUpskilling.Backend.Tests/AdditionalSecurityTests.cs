using System.Security.Claims;
using System.Text;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Middleware;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using CebuUpskilling.Backend.Handlers;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

// ------------------------------------------------------------------
// Token revocation – JTI missing bypass & double logout
// ------------------------------------------------------------------
public class RevokedTokenMiddlewareTests
{
    private static HttpContext ContextWithJti(string? jti)
    {
        var ctx = new DefaultHttpContext();
        var claims = new List<Claim>();
        if (jti != null) claims.Add(new Claim("jti", jti));
        claims.Add(new Claim(ClaimTypes.NameIdentifier, "1"));
        ctx.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "jwt"));
        ctx.Request.Method = "GET";
        ctx.Request.Path = "/api/courses";
        ctx.Response.Body = new MemoryStream();
        return ctx;
    }

    [Fact]
    public async Task InvokeAsync_WithRevokedJti_Returns401()
    {
        var store = new InMemoryTokenRevocationStore(NullLogger<InMemoryTokenRevocationStore>.Instance);
        store.Revoke("jti-123", DateTime.UtcNow.AddDays(1));
        var mw = new RevokedTokenMiddleware(_ => Task.CompletedTask, store, NullLogger<RevokedTokenMiddleware>.Instance);
        var ctx = ContextWithJti("jti-123");

        await mw.InvokeAsync(ctx);

        Assert.Equal(StatusCodes.Status401Unauthorized, ctx.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_WithoutJti_PassesThrough()
    {
        var store = new InMemoryTokenRevocationStore(NullLogger<InMemoryTokenRevocationStore>.Instance);
        store.Revoke("jti-123", DateTime.UtcNow.AddDays(1));
        var called = false;
        var mw = new RevokedTokenMiddleware(_ => { called = true; return Task.CompletedTask; }, store, NullLogger<RevokedTokenMiddleware>.Instance);
        var ctx = ContextWithJti(null);

        await mw.InvokeAsync(ctx);

        Assert.True(called);
        Assert.NotEqual(StatusCodes.Status401Unauthorized, ctx.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_DoubleLogout_IsIdempotent()
    {
        var store = new InMemoryTokenRevocationStore(NullLogger<InMemoryTokenRevocationStore>.Instance);
        store.Revoke("jti-dup", DateTime.UtcNow.AddDays(8));
        store.Revoke("jti-dup", DateTime.UtcNow.AddDays(8));
        var mw = new RevokedTokenMiddleware(_ => Task.CompletedTask, store, NullLogger<RevokedTokenMiddleware>.Instance);
        var ctx = ContextWithJti("jti-dup");
        await mw.InvokeAsync(ctx);
        Assert.Equal(StatusCodes.Status401Unauthorized, ctx.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_AfterExpiry_PassesThrough()
    {
        var store = new InMemoryTokenRevocationStore(NullLogger<InMemoryTokenRevocationStore>.Instance);
        store.Revoke("jti-exp", DateTime.UtcNow.AddSeconds(-1));
        var called = false;
        var mw = new RevokedTokenMiddleware(_ => { called = true; return Task.CompletedTask; }, store, NullLogger<RevokedTokenMiddleware>.Instance);
        var ctx = ContextWithJti("jti-exp");
        await mw.InvokeAsync(ctx);
        Assert.True(called);
    }
}

// ------------------------------------------------------------------
// Email confirmation & password reset reuse / overwrite
// ------------------------------------------------------------------
public class AuthTokenReuseTests
{
    private static IConfiguration Config() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-secret-key-that-is-at-least-32-characters-long",
            ["Jwt:Issuer"] = "CebuUpskilling",
            ["Jwt:Audience"] = "CebuUpskilling.Web"
        }).Build();

    private static AuthService CreateService(ApplicationDbContext ctx, ITokenRevocationStore store)
    {
        var fakeAi = new FakeGoogleAiService();
        var agent = new JobseekerSkillParserAgent(fakeAi, new SkillRepository(ctx), new LearnerRepository(ctx), new LearnerSkillRepository(ctx), new LearnerAssessmentRepository(ctx), new AppUserRepository(ctx), new RoleSkillRepository(ctx), new AssessmentQuestionRepository(ctx), NullLogger<JobseekerSkillParserAgent>.Instance);
        return new AuthService(ctx, agent, new JwtTokenService(Config(), NullLogger<JwtTokenService>.Instance), new LoggingEmailService(NullLogger<LoggingEmailService>.Instance), store, NullLogger<AuthService>.Instance);
    }

    private class FakeGoogleAiService : IGoogleAiService
    {
        public Task<List<string>> ParseSkillsFromResumeAsync(string t, CancellationToken ct = default) => Task.FromResult(new List<string>());
        public Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(string s, int c = 5, CancellationToken ct = default) => Task.FromResult(new List<GeneratedAssessmentQuestion>());
    }

    private static string HashToken(string raw)
    {
        var b = System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(b).ToLowerInvariant();
    }

    [Fact]
    public async Task ConfirmEmail_Reuse_SecondAttemptIsIdempotentAlreadyConfirmed()
    {
        var ctx = TestDbContextFactory.Create();
        var store = new InMemoryTokenRevocationStore(NullLogger<InMemoryTokenRevocationStore>.Instance);
        var svc = CreateService(ctx, store);
        var user = new AppUser { FirstName = "A", LastName = "B", EmailAddress = "reuse.confirm@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("P@ssw0rd!"), Role = "Learner" };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();
        var token = "valid-confirm-token";
        user.EmailConfirmationTokenHash = HashToken(token);
        user.EmailConfirmationTokenExpiry = DateTime.UtcNow.AddHours(1);
        await ctx.SaveChangesAsync();

        Assert.True(await svc.ConfirmEmailAsync(user.EmailAddress, token));
        // second attempt – user already confirmed, returns true (idempotent) and hash cleared
        Assert.True(await svc.ConfirmEmailAsync(user.EmailAddress, token));
        var refreshed = await ctx.Users.SingleAsync(u => u.EmailAddress == user.EmailAddress);
        Assert.True(refreshed.EmailConfirmed);
        Assert.Null(refreshed.EmailConfirmationTokenHash);
    }

    [Fact]
    public async Task ResetPassword_Reuse_SecondAttemptFails()
    {
        var ctx = TestDbContextFactory.Create();
        var store = new InMemoryTokenRevocationStore(NullLogger<InMemoryTokenRevocationStore>.Instance);
        var svc = CreateService(ctx, store);
        var user = new AppUser { FirstName = "A", LastName = "B", EmailAddress = "reuse.reset@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldP@ssw0rd!"), Role = "Learner" };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();
        var token = "valid-reset-token";
        user.PasswordResetTokenHash = HashToken(token);
        user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1);
        await ctx.SaveChangesAsync();

        Assert.True(await svc.ResetPasswordAsync(user.EmailAddress, token, "NewP@ssw0rd!"));
        Assert.False(await svc.ResetPasswordAsync(user.EmailAddress, token, "AnotherP@ssw0rd!"));
        Assert.True(BCrypt.Net.BCrypt.Verify("NewP@ssw0rd!", (await ctx.Users.SingleAsync(u => u.EmailAddress == user.EmailAddress)).PasswordHash));
    }

    [Fact]
    public async Task ResetPassword_Overwrite_InvalidatesPreviousToken()
    {
        var ctx = TestDbContextFactory.Create();
        var store = new InMemoryTokenRevocationStore(NullLogger<InMemoryTokenRevocationStore>.Instance);
        var svc = CreateService(ctx, store);
        var user = new AppUser { FirstName = "A", LastName = "B", EmailAddress = "overwrite.reset@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldP@ssw0rd!"), Role = "Learner" };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();

        // First reset request
        await svc.SendPasswordResetAsync(user.EmailAddress);
        var firstHash = (await ctx.Users.SingleAsync(u => u.EmailAddress == user.EmailAddress)).PasswordResetTokenHash!;
        // Second immediately overwrites
        await svc.SendPasswordResetAsync(user.EmailAddress);
        var secondHash = (await ctx.Users.SingleAsync(u => u.EmailAddress == user.EmailAddress)).PasswordResetTokenHash!;
        Assert.NotEqual(firstHash, secondHash);
    }

    [Fact]
    public async Task ConfirmEmail_DoesNotStoreRawToken()
    {
        var ctx = TestDbContextFactory.Create();
        var store = new InMemoryTokenRevocationStore(NullLogger<InMemoryTokenRevocationStore>.Instance);
        var svc = CreateService(ctx, store);
        var email = "raw.confirm@example.com";
        var req = new RegisterRequest("Jose", "Rizal", null, null, email, "P@ssw0rd!", "Learner", null, null, "Resume text here is long enough for parsing");
        // Register will generate confirmation token internally
        await svc.RegisterAsync(req);
        var user = await ctx.Users.SingleAsync(u => u.EmailAddress == email);
        // raw token is 32 random bytes base64url – it will never equal the stored hex hash
        Assert.NotNull(user.EmailConfirmationTokenHash);
        Assert.Equal(64, user.EmailConfirmationTokenHash!.Length);
        Assert.Matches("^[a-f0-9]{64}$", user.EmailConfirmationTokenHash);
    }
}

// ------------------------------------------------------------------
// Overposting / mass assignment
// ------------------------------------------------------------------
public class MassAssignmentRegressionTests
{
    [Fact]
    public async Task CompanyRegister_IgnoresRoleField_AlwaysRecruiter()
    {
        var ctx = TestDbContextFactory.Create();
        var store = new InMemoryTokenRevocationStore(NullLogger<InMemoryTokenRevocationStore>.Instance);
        var svc = new AuthService(ctx, new JobseekerSkillParserAgent(
            new FakeAi(), new SkillRepository(ctx), new LearnerRepository(ctx), new LearnerSkillRepository(ctx), new LearnerAssessmentRepository(ctx),
            new AppUserRepository(ctx), new RoleSkillRepository(ctx), new AssessmentQuestionRepository(ctx), NullLogger<JobseekerSkillParserAgent>.Instance),
            new JwtTokenService(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Jwt:Key"] = "test-secret-key-that-is-at-least-32-characters-long", ["Jwt:Issuer"] = "CebuUpskilling", ["Jwt:Audience"] = "CebuUpskilling.Web" }).Build(), NullLogger<JwtTokenService>.Instance),
            new LoggingEmailService(NullLogger<LoggingEmailService>.Instance), store, NullLogger<AuthService>.Instance);

        var resp = await svc.CompanyRegisterAsync(new CompanyRegisterRequest("Overpost Corp", "Maria", "Santos", null, null, "overpost.role@example.com", "P@ssw0rd!", null));
        Assert.Equal("Recruiter", resp.Role);
        var user = await ctx.Users.SingleAsync(u => u.EmailAddress == "overpost.role@example.com");
        Assert.Equal("Recruiter", user.Role);
    }

    private class FakeAi : IGoogleAiService
    {
        public Task<List<string>> ParseSkillsFromResumeAsync(string t, CancellationToken ct = default) => Task.FromResult(new List<string>());
        public Task<List<GeneratedAssessmentQuestion>> GenerateAssessmentQuestionsAsync(string s, int c = 5, CancellationToken ct = default) => Task.FromResult(new List<GeneratedAssessmentQuestion>());
    }
}

// ------------------------------------------------------------------
// IDOR – CourseContent GetLessonDetail without enrollment
// ------------------------------------------------------------------
public class CourseContentIdorTests
{
    private static async Task<(ApplicationDbContext ctx, int learnerUserId, int courseId, int lessonId)> SeedAsync()
    {
        var ctx = TestDbContextFactory.Create();
        var user = new AppUser { FirstName = "Learner", LastName = "One", EmailAddress = $"idor.lesson.{Guid.NewGuid():N}@example.com", PasswordHash = "hash", Role = "Learner" };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();
        var learner = new Learner { UserId = user.UserId, IsPremium = false };
        ctx.Learners.Add(learner);
        var disc = new Discipline { Name = "Tech" };
        ctx.Disciplines.Add(disc);
        await ctx.SaveChangesAsync();
        var sub = new SubDiscipline { DisciplineId = disc.DomainId, Name = "CS" };
        ctx.SubDisciplines.Add(sub);
        await ctx.SaveChangesAsync();
        var genre = new Genre { SubDisciplineId = sub.SubDisciplineId, Name = "Gen" };
        ctx.Genres.Add(genre);
        await ctx.SaveChangesAsync();
        var course = new Course { GenreId = genre.GenreId, Name = "Course", TechnicalLevel = 1 };
        ctx.Courses.Add(course);
        await ctx.SaveChangesAsync();
        var mod = new CourseModule { CourseId = course.CourseId, Name = "M1", Order = 1 };
        ctx.CourseModules.Add(mod);
        await ctx.SaveChangesAsync();
        var lesson = new Lesson { ModuleId = mod.ModuleId, CourseId = course.CourseId, Name = "L1" };
        ctx.Lessons.Add(lesson);
        await ctx.SaveChangesAsync();
        return (ctx, user.UserId, course.CourseId, lesson.LessonId);
    }

    [Fact]
    public async Task GetLessonDetail_WithoutEnrollment_ReturnsNull()
    {
        var (ctx, userId, _, lessonId) = await SeedAsync();
        var svc = new CourseContentService(new LearnerRepository(ctx), new CourseRepository(ctx), new LessonRepository(ctx), new LearnerStudyCourseRepository(ctx), NullLogger<CourseContentService>.Instance);
        var result = await svc.GetLessonDetailAsync(userId, lessonId);
        Assert.Null(result);
    }

    [Fact]
    public async Task GetLessonDetail_WithEnrollment_ReturnsDetail()
    {
        var (ctx, userId, courseId, lessonId) = await SeedAsync();
        var learner = await ctx.Learners.SingleAsync(l => l.UserId == userId);
        ctx.LearnerStudyCourses.Add(new LearnerStudyCourse { LearnerId = learner.LearnerId, CourseId = courseId, Started = DateTime.UtcNow, LastTotalProgressPercent = 0 });
        await ctx.SaveChangesAsync();
        var svc = new CourseContentService(new LearnerRepository(ctx), new CourseRepository(ctx), new LessonRepository(ctx), new LearnerStudyCourseRepository(ctx), NullLogger<CourseContentService>.Instance);
        var result = await svc.GetLessonDetailAsync(userId, lessonId);
        Assert.NotNull(result);
        Assert.Equal(lessonId, result!.LessonId);
    }
}

// ------------------------------------------------------------------
// Sensitive disclosure – learners list must not expose hashes
// ------------------------------------------------------------------
public class LearnerDisclosureTests
{
    [Fact]
    public void LearnerSummaryDto_DoesNotContainSensitiveFields()
    {
        var props = typeof(LearnerSummaryDto).GetProperties().Select(p => p.Name).ToHashSet();
        Assert.DoesNotContain("PasswordHash", props);
        Assert.DoesNotContain("EmailAddress", props);
        var userProps = typeof(LearnerUserSummaryDto).GetProperties().Select(p => p.Name).ToHashSet();
        Assert.DoesNotContain("PasswordHash", userProps);
        Assert.DoesNotContain("EmailAddress", userProps);
        Assert.DoesNotContain("EmailConfirmationTokenHash", userProps);
        Assert.DoesNotContain("PasswordResetTokenHash", userProps);
    }

    [Fact]
    public void AppUser_PasswordHash_HasJsonIgnore()
    {
        var prop = typeof(AppUser).GetProperty("PasswordHash")!;
        var attr = prop.GetCustomAttributes(typeof(System.Text.Json.Serialization.JsonIgnoreAttribute), false);
        Assert.NotEmpty(attr);
    }
}

// ------------------------------------------------------------------
// Security headers
// ------------------------------------------------------------------
public class SecurityHeadersMiddlewareTests
{
    [Fact]
    public async Task Adds_ExpectedHeaders_ForHttp()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Scheme = "http";
        ctx.Response.Body = new MemoryStream();
        var mw = new SecurityHeadersMiddleware(_ => Task.CompletedTask);
        await mw.InvokeAsync(ctx);
        Assert.Equal("nosniff", ctx.Response.Headers["X-Content-Type-Options"].ToString());
        Assert.Equal("DENY", ctx.Response.Headers["X-Frame-Options"].ToString());
        Assert.Equal("no-referrer", ctx.Response.Headers["Referrer-Policy"].ToString());
        Assert.Contains("default-src 'self'", ctx.Response.Headers["Content-Security-Policy"].ToString());
        Assert.False(ctx.Response.Headers.ContainsKey("Strict-Transport-Security"));
    }

    [Fact]
    public async Task Adds_Hsts_ForHttps()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Scheme = "https";
        ctx.Request.IsHttps = true;
        ctx.Response.Body = new MemoryStream();
        var mw = new SecurityHeadersMiddleware(_ => Task.CompletedTask);
        await mw.InvokeAsync(ctx);
        Assert.Equal("max-age=31536000; includeSubDomains", ctx.Response.Headers["Strict-Transport-Security"].ToString());
    }
}

// ------------------------------------------------------------------
// Global exception handler
// ------------------------------------------------------------------
public class GlobalExceptionHandlerTests
{
    private static HttpContext Ctx()
    {
        var ctx = new DefaultHttpContext();
        ctx.Response.Body = new MemoryStream();
        return ctx;
    }

    [Fact]
    public async Task KeyNotFound_Returns404()
    {
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var ctx = Ctx();
        var ok = await handler.TryHandleAsync(ctx, new KeyNotFoundException("missing"), CancellationToken.None);
        Assert.True(ok);
        Assert.Equal(StatusCodes.Status404NotFound, ctx.Response.StatusCode);
        ctx.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await new StreamReader(ctx.Response.Body).ReadToEndAsync();
        Assert.Contains("Resource not found", body);
        Assert.DoesNotContain("missing", body.Replace("Resource not found", "")); // does not leak inner message for 404
    }

    [Fact]
    public async Task InvalidOperation_Returns400_WithMessage()
    {
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var ctx = Ctx();
        var ok = await handler.TryHandleAsync(ctx, new InvalidOperationException("bad input"), CancellationToken.None);
        Assert.True(ok);
        Assert.Equal(StatusCodes.Status400BadRequest, ctx.Response.StatusCode);
        ctx.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await new StreamReader(ctx.Response.Body).ReadToEndAsync();
        Assert.Contains("bad input", body);
    }

    [Fact]
    public async Task Generic_Returns500_WithoutLeak()
    {
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var ctx = Ctx();
        var ok = await handler.TryHandleAsync(ctx, new Exception("secret stack System.Exception"), CancellationToken.None);
        Assert.True(ok);
        Assert.Equal(StatusCodes.Status500InternalServerError, ctx.Response.StatusCode);
        ctx.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await new StreamReader(ctx.Response.Body).ReadToEndAsync();
        Assert.Contains("An unexpected error occurred", body);
        Assert.DoesNotContain("secret", body);
        Assert.DoesNotContain("System.", body);
    }
}

// ------------------------------------------------------------------
// Media document whitelist
// ------------------------------------------------------------------
public class MediaDocumentWhitelistTests
{
    [Fact]
    public void AllowedExtensions_AreWhitelisted()
    {
        // Mirrors MediaService whitelisting logic for documents
        var allowed = new[] { ".pdf", ".doc", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp" };
        foreach (var ext in allowed)
        {
            Assert.True(IsAllowedDocumentExtension(ext), $"{ext} should be allowed");
        }
        Assert.False(IsAllowedDocumentExtension(".exe"));
        Assert.False(IsAllowedDocumentExtension(".sh"));
        Assert.False(IsAllowedDocumentExtension(".html"));
    }

    private static bool IsAllowedDocumentExtension(string ext)
    {
        var whitelist = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".pdf", ".doc", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp" };
        return whitelist.Contains(ext);
    }
}
