using System.Net;
using System.Net.Http.Json;

namespace CebuUpskilling.Backend.Tests.Integration;

public class RefreshApiTests : ProductionApiTestBase
{
    public RefreshApiTests(ProductionApiFactory factory) : base(factory) { }

    private async Task<(string Token, string RefreshToken)> RegisterProviderAsync(string email)
    {
        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Prov",
            lastName = "Ider",
            emailAddress = email,
            password = "P@ssw0rd!",
            role = "CourseProvider",
        });
        response.EnsureSuccessStatusCode();
        var body = await ReadJsonAsync(response);
        return (body.GetProperty("token").GetString()!, body.GetProperty("refreshToken").GetString()!);
    }

    [Fact]
    public async Task Refresh_ValidToken_ReturnsNewPair()
    {
        var (_, refreshToken) = await RegisterProviderAsync("refresh.api.valid@example.com");

        var response = await Client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("token").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("refreshToken").GetString()));
        Assert.NotEqual(refreshToken, body.GetProperty("refreshToken").GetString());
    }

    [Fact]
    public async Task Refresh_RotatedTokenReuse_IsRejected()
    {
        var (_, refreshToken) = await RegisterProviderAsync("refresh.api.reuse@example.com");

        var first = await Client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken });
        first.EnsureSuccessStatusCode();

        var replay = await Client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);
    }

    [Fact]
    public async Task Refresh_UnknownToken_ReturnsUnauthorized()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = "bogus" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_MissingToken_ReturnsBadRequest()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = "" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Logout_WithRefreshToken_RevokesIt()
    {
        var (token, refreshToken) = await RegisterProviderAsync("refresh.api.logout@example.com");

        var logout = await AuthorizedClient(token).PostAsJsonAsync("/api/auth/logout", new { refreshToken });
        Assert.Equal(HttpStatusCode.OK, logout.StatusCode);

        var refresh = await Client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }
}
