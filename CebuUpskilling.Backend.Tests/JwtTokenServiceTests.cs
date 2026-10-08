using System.Security.Claims;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class JwtTokenServiceTests
{
    private static IJwtTokenService CreateTokenService(string? overrideKey = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = overrideKey ?? "test-secret-key-that-is-at-least-32-characters-long",
                ["Jwt:Issuer"] = "CebuUpskilling",
                ["Jwt:Audience"] = "CebuUpskilling.Web"
            })
            .Build();

        return new JwtTokenService(config, NullLogger<JwtTokenService>.Instance);
    }

    private static AppUser CreateUser() => new()
    {
        UserId = Guid.NewGuid(),
        FirstName = "Jose",
        LastName = "Rizal",
        EmailAddress = "jose@example.com",
        Role = "Learner"
    };

    [Fact]
    public void GenerateToken_ReturnsNonEmptyToken()
    {
        var token = CreateTokenService().GenerateToken(CreateUser());

        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.Equal(3, token.Split('.').Length);
    }

    [Fact]
    public void GenerateToken_ContainsExpectedClaims()
    {
        var user = CreateUser();
        var token = CreateTokenService().GenerateToken(user);
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.Equal(user.UserId.ToString(), jwt.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Equal("jose@example.com", jwt.Claims.First(c => c.Type == ClaimTypes.Email).Value);
        Assert.Equal("Jose Rizal", jwt.Claims.First(c => c.Type == ClaimTypes.Name).Value);
        Assert.Equal("Learner", jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value);
    }

    [Fact]
    public void GenerateToken_ContainsConfiguredIssuerAndAudience()
    {
        var token = CreateTokenService().GenerateToken(CreateUser());
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.Equal("CebuUpskilling", jwt.Issuer);
        Assert.Contains("CebuUpskilling.Web", jwt.Audiences);
    }

    [Fact]
    public void GenerateToken_ExpiresPerConfiguredAccessMinutes()
    {
        var token = CreateTokenService().GenerateToken(CreateUser());
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        var expected = DateTime.UtcNow.AddMinutes(15);
        Assert.True(jwt.ValidTo > DateTime.UtcNow.AddMinutes(14));
        Assert.True(jwt.ValidTo <= expected.AddSeconds(30));
        Assert.True(jwt.ValidFrom <= DateTime.UtcNow);
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsOpaqueToken()
    {
        var service = CreateTokenService();

        var first = service.GenerateRefreshToken();
        var second = service.GenerateRefreshToken();

        Assert.False(string.IsNullOrWhiteSpace(first));
        Assert.NotEqual(first, second);
        Assert.Equal(TimeSpan.FromMinutes(15), service.AccessLifetime);
        Assert.Equal(TimeSpan.FromDays(30), service.RefreshLifetime);
    }
}
