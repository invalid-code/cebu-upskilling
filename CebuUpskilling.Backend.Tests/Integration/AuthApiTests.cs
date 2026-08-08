using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace CebuUpskilling.Backend.Tests.Integration;

public class AuthApiTests : ProductionApiTestBase
{
    public AuthApiTests(ProductionApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Register_ValidLearner_ReturnsProfileAndToken()
    {
        var response = await RegisterAsync(new
        {
            firstName = "Jose",
            lastName = "Rizal",
            emailAddress = "auth.register@example.com",
            password = "P@ssw0rd!",
            role = "Learner",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await ReadJsonAsync(response);
        Assert.True(body.GetProperty("userId").GetInt32() > 0);
        Assert.Equal("Jose", body.GetProperty("firstName").GetString());
        Assert.Equal("Rizal", body.GetProperty("lastName").GetString());
        Assert.Equal("auth.register@example.com", body.GetProperty("emailAddress").GetString());
        Assert.Equal("Learner", body.GetProperty("role").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("token").GetString()));
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsBadRequest()
    {
        var request = new
        {
            firstName = "Jose",
            lastName = "Rizal",
            emailAddress = "auth.duplicate@example.com",
            password = "P@ssw0rd!",
            role = "Learner",
        };

        var first = await RegisterAsync(request);
        first.EnsureSuccessStatusCode();

        var second = await RegisterAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        var body = await ReadJsonAsync(second);
        Assert.Equal("Email already registered", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Register_LearnerWithTargetRole_IsPersisted()
    {
        var token = await RegisterLearnerAsync("auth.targetrole@example.com", "Frontend Developer");

        var body = await LoginAsync(new { emailAddress = "auth.targetrole@example.com", password = "P@ssw0rd!" });
        body.EnsureSuccessStatusCode();

        var login = await ReadJsonAsync(body);
        Assert.Equal("Frontend Developer", login.GetProperty("targetRole").GetString());
        Assert.False(string.IsNullOrWhiteSpace(token));
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsToken()
    {
        await RegisterLearnerAsync("auth.login@example.com");

        var response = await LoginAsync(new { emailAddress = "auth.login@example.com", password = "P@ssw0rd!" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("auth.login@example.com", body.GetProperty("emailAddress").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("token").GetString()));
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        await RegisterLearnerAsync("auth.wrongpass@example.com");

        var response = await LoginAsync(new { emailAddress = "auth.wrongpass@example.com", password = "wrong-password" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Invalid credentials", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Login_UnknownEmail_ReturnsUnauthorized()
    {
        var response = await LoginAsync(new { emailAddress = "auth.ghost@example.com", password = "P@ssw0rd!" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProfile_WithAuth_SetsTargetRole()
    {
        var token = await RegisterLearnerAsync("auth.profile@example.com");

        var response = await AuthorizedClient(token).PatchAsJsonAsync("/api/auth/profile", new
        {
            targetRole = "Backend Developer",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Backend Developer", body.GetProperty("targetRole").GetString());
    }

    [Fact]
    public async Task UpdateProfile_WithoutAuth_ReturnsUnauthorized()
    {
        var response = await Client.PatchAsJsonAsync("/api/auth/profile", new { targetRole = "Backend Developer" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithoutToken_ReturnsUnauthorized()
    {
        var response = await Client.GetAsync("/api/disciplines");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
