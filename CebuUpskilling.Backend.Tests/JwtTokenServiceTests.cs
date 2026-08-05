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
        UserId = 42,
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
        var token = CreateTokenService().GenerateToken(CreateUser());
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.Equal("42", jwt.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);
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
    public void GenerateToken_ExpiresSevenDaysOut()
    {
        var token = CreateTokenService().GenerateToken(CreateUser());
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        var expected = DateTime.UtcNow.AddDays(7);
        Assert.True(jwt.ValidTo > DateTime.UtcNow.AddDays(6.9));
        Assert.True(jwt.ValidTo <= expected.AddSeconds(30));
        Assert.True(jwt.ValidFrom <= DateTime.UtcNow);
    }
}
