using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class RefreshTokenTests
{
    private static IConfiguration CreateConfig() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-secret-key-that-is-at-least-32-characters-long",
            ["Jwt:Issuer"] = "CebuUpskilling",
            ["Jwt:Audience"] = "CebuUpskilling.Web",
            ["Jwt:AccessMinutes"] = "15",
            ["Jwt:RefreshDays"] = "30",
        })
        .Build();

    private sealed class FakeGoogleTokenVerifier : IGoogleTokenVerifier
    {
        public Task<GoogleUserInfo> VerifyIdTokenAsync(string idToken) =>
            Task.FromResult(new GoogleUserInfo("sub-1", "x@example.com", "X", "Y"));
    }

    private sealed class FakeResumeParseQueue : IResumeParseQueue
    {
        public void Enqueue(ResumeParseJob job) { }
        public System.Threading.Channels.ChannelReader<ResumeParseJob> Reader
            => System.Threading.Channels.Channel.CreateUnbounded<ResumeParseJob>().Reader;
    }

    private static AuthService CreateService(Data.ApplicationDbContext context)
    {
        var storage = new FakeObjectStorage();
        var resumeService = new ResumeService(storage, NullLogger<ResumeService>.Instance);
        return new AuthService(
            context,
            new JwtTokenService(CreateConfig(), NullLogger<JwtTokenService>.Instance),
            new LoggingEmailService(NullLogger<LoggingEmailService>.Instance),
            new InMemoryTokenRevocationStore(NullLogger<InMemoryTokenRevocationStore>.Instance),
            new FakeGoogleTokenVerifier(),
            resumeService,
            new FakeResumeParseQueue(),
            NullLogger<AuthService>.Instance);
    }

    private sealed class FakeObjectStorage : IObjectStorageService
    {
        public Task<string> UploadAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default) =>
            Task.FromResult($"https://fake.example/{key}");
        public Task DeleteAsync(string key, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public string GetPublicUrl(string key) => $"https://fake.example/{key}";
    }

    private static RegisterRequest ProviderRequest(string email) => new(
        "Prov", "Ider", null, null, email, "P@ssw0rd!", "CourseProvider", null, null);

    [Fact]
    public async Task Register_IssuesRefreshToken_PersistedAsHash()
    {
        using var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.RegisterAsync(ProviderRequest("refresh.issue@example.com"));

        Assert.False(string.IsNullOrWhiteSpace(result.RefreshToken));
        Assert.Equal(1, await context.RefreshTokens.CountAsync());
        var stored = await context.RefreshTokens.SingleAsync();
        Assert.NotEqual(result.RefreshToken, stored.TokenHash);
        Assert.True(stored.ExpiresAt > DateTime.UtcNow.AddDays(29));
        Assert.Null(stored.RevokedAt);
    }

    [Fact]
    public async Task Refresh_RotatesToken_OldTokenRevoked()
    {
        using var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var first = await service.RegisterAsync(ProviderRequest("refresh.rotate@example.com"));
        var second = await service.RefreshAsync(first.RefreshToken!);

        Assert.False(string.IsNullOrWhiteSpace(second.RefreshToken));
        Assert.NotEqual(first.RefreshToken, second.RefreshToken);
        Assert.NotEqual(first.Token, second.Token);
        Assert.Equal(2, await context.RefreshTokens.CountAsync());

        // Old token is now revoked: reuse must fail.
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.RefreshAsync(first.RefreshToken!));
    }

    [Fact]
    public async Task Refresh_ReuseOfRotatedToken_RevokesAllSessions()
    {
        using var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var first = await service.RegisterAsync(ProviderRequest("refresh.reuse@example.com"));
        var second = await service.RefreshAsync(first.RefreshToken!);

        // Attacker replays the already-rotated token: all sessions die.
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.RefreshAsync(first.RefreshToken!));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.RefreshAsync(second.RefreshToken!));
    }

    [Fact]
    public async Task Refresh_UnknownToken_ThrowsUnauthorized()
    {
        using var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.RefreshAsync("nope"));
    }

    [Fact]
    public async Task Refresh_ExpiredToken_IsRejected()
    {
        using var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.RegisterAsync(ProviderRequest("refresh.expired@example.com"));
        var stored = await context.RefreshTokens.SingleAsync();
        stored.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.RefreshAsync(result.RefreshToken!));
    }

    [Fact]
    public async Task Logout_WithRefreshToken_RevokesIt()
    {
        using var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.RegisterAsync(ProviderRequest("refresh.logout@example.com"));
        await service.LogoutAsync(jti: null, refreshToken: result.RefreshToken);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.RefreshAsync(result.RefreshToken!));
    }

    [Fact]
    public async Task Login_IssuesFreshRefreshToken()
    {
        using var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        await service.RegisterAsync(ProviderRequest("refresh.login@example.com"));
        var login = await service.LoginAsync(new LoginRequest("refresh.login@example.com", "P@ssw0rd!"));

        Assert.False(string.IsNullOrWhiteSpace(login.RefreshToken));
        Assert.Equal(2, await context.RefreshTokens.CountAsync());
    }
}
