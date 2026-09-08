using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Endpoint-level regression coverage for the auth flows that the older suites
/// don't reach: email confirmation, password reset, logout/token revocation and
/// company registration. Runs against the real HTTP pipeline and an isolated
/// in-memory test database.
/// </summary>
public class AuthFlowsRegressionApiTests : ProductionApiTestBase
{
    public AuthFlowsRegressionApiTests(ProductionApiFactory factory) : base(factory) { }

    // ------------------------------------------------------------------ //
    // Email confirmation
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task ConfirmEmail_WithValidToken_ConfirmsAndClearsStoredToken()
    {
        await SeedUserAsync(
            "authflow.confirm.valid@example.com",
            confirmToken: "valid-confirm-token",
            confirmExpiry: DateTime.UtcNow.AddHours(1));

        var response = await Client.PostAsJsonAsync("/api/auth/confirm-email", new
        {
            email = "authflow.confirm.valid@example.com",
            token = "valid-confirm-token",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Email confirmed successfully.", body.GetProperty("message").GetString());

        await using var context = Factory.CreateDbContext();
        var user = await context.Users.SingleAsync(u => u.EmailAddress == "authflow.confirm.valid@example.com");
        Assert.True(user.EmailConfirmed);
        Assert.Null(user.EmailConfirmationTokenHash);
        Assert.Null(user.EmailConfirmationTokenExpiry);
    }

    [Fact]
    public async Task ConfirmEmail_WithWrongToken_ReturnsBadRequest()
    {
        await SeedUserAsync(
            "authflow.confirm.wrong@example.com",
            confirmToken: "real-confirm-token",
            confirmExpiry: DateTime.UtcNow.AddHours(1));

        var response = await Client.PostAsJsonAsync("/api/auth/confirm-email", new
        {
            email = "authflow.confirm.wrong@example.com",
            token = "wrong-confirm-token",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Invalid or expired confirmation token.", body.GetProperty("error").GetString());

        await using var context = Factory.CreateDbContext();
        var user = await context.Users.SingleAsync(u => u.EmailAddress == "authflow.confirm.wrong@example.com");
        Assert.False(user.EmailConfirmed);
    }

    [Fact]
    public async Task ConfirmEmail_WithExpiredToken_ReturnsBadRequest()
    {
        await SeedUserAsync(
            "authflow.confirm.expired@example.com",
            confirmToken: "expired-confirm-token",
            confirmExpiry: DateTime.UtcNow.AddHours(-1));

        var response = await Client.PostAsJsonAsync("/api/auth/confirm-email", new
        {
            email = "authflow.confirm.expired@example.com",
            token = "expired-confirm-token",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ConfirmEmail_ForUnknownEmail_ReturnsBadRequest()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/confirm-email", new
        {
            email = "authflow.confirm.ghost@example.com",
            token = "some-token",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ConfirmEmail_WhenAlreadyConfirmed_ReturnsOk()
    {
        await SeedUserAsync("authflow.confirm.done@example.com", emailConfirmed: true);

        var response = await Client.PostAsJsonAsync("/api/auth/confirm-email", new
        {
            email = "authflow.confirm.done@example.com",
            token = "whatever",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ResendConfirmation_ForUnconfirmedUser_RegeneratesToken()
    {
        await SeedUserAsync(
            "authflow.resend.unconfirmed@example.com",
            confirmToken: "original-confirm-token",
            confirmExpiry: DateTime.UtcNow.AddHours(1));

        var response = await Client.PostAsJsonAsync("/api/auth/resend-confirmation", new
        {
            email = "authflow.resend.unconfirmed@example.com",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("If the account exists, a confirmation email has been sent.", body.GetProperty("message").GetString());

        await using var context = Factory.CreateDbContext();
        var user = await context.Users.SingleAsync(u => u.EmailAddress == "authflow.resend.unconfirmed@example.com");
        Assert.False(user.EmailConfirmed);
        Assert.NotEqual(HashToken("original-confirm-token"), user.EmailConfirmationTokenHash);
        Assert.NotNull(user.EmailConfirmationTokenExpiry);
        Assert.True(user.EmailConfirmationTokenExpiry > DateTime.UtcNow);
    }

    [Fact]
    public async Task ResendConfirmation_ForConfirmedUser_DoesNotRegenerateToken()
    {
        await SeedUserAsync(
            "authflow.resend.confirmed@example.com",
            emailConfirmed: true,
            confirmToken: "stale-confirm-token",
            confirmExpiry: DateTime.UtcNow.AddHours(1));

        var response = await Client.PostAsJsonAsync("/api/auth/resend-confirmation", new
        {
            email = "authflow.resend.confirmed@example.com",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var context = Factory.CreateDbContext();
        var user = await context.Users.SingleAsync(u => u.EmailAddress == "authflow.resend.confirmed@example.com");
        Assert.Equal(HashToken("stale-confirm-token"), user.EmailConfirmationTokenHash);
    }

    [Fact]
    public async Task ResendConfirmation_ForUnknownEmail_ReturnsOkMessageWithoutLeaking()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/resend-confirmation", new
        {
            email = "authflow.resend.ghost@example.com",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Password reset
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task ForgotPassword_ForExistingUser_SetsResetToken()
    {
        await SeedUserAsync("authflow.forgot.existing@example.com");

        var response = await Client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email = "authflow.forgot.existing@example.com",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("If the account exists, a password reset email has been sent.", body.GetProperty("message").GetString());

        await using var context = Factory.CreateDbContext();
        var user = await context.Users.SingleAsync(u => u.EmailAddress == "authflow.forgot.existing@example.com");
        Assert.NotNull(user.PasswordResetTokenHash);
        Assert.NotNull(user.PasswordResetTokenExpiry);
        Assert.True(user.PasswordResetTokenExpiry > DateTime.UtcNow);
    }

    [Fact]
    public async Task ForgotPassword_ForUnknownEmail_ReturnsOkMessageWithoutLeaking()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email = "authflow.forgot.ghost@example.com",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_WithValidToken_UpdatesPasswordAndAllowsNewLogin()
    {
        await SeedUserAsync(
            "authflow.reset.valid@example.com",
            resetToken: "valid-reset-token",
            resetExpiry: DateTime.UtcNow.AddHours(1));

        var response = await Client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            email = "authflow.reset.valid@example.com",
            token = "valid-reset-token",
            newPassword = "NewP@ssw0rd!",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Password has been reset. You can now log in.", body.GetProperty("message").GetString());

        await using (var context = Factory.CreateDbContext())
        {
            var user = await context.Users.SingleAsync(u => u.EmailAddress == "authflow.reset.valid@example.com");
            Assert.Null(user.PasswordResetTokenHash);
            Assert.Null(user.PasswordResetTokenExpiry);
            Assert.True(BCrypt.Net.BCrypt.Verify("NewP@ssw0rd!", user.PasswordHash));
        }

        var oldLogin = await LoginAsync(new { emailAddress = "authflow.reset.valid@example.com", password = "OldP@ssw0rd!" });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newLogin = await LoginAsync(new { emailAddress = "authflow.reset.valid@example.com", password = "NewP@ssw0rd!" });
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_WithInvalidToken_ReturnsBadRequest()
    {
        await SeedUserAsync(
            "authflow.reset.wrong@example.com",
            resetToken: "real-reset-token",
            resetExpiry: DateTime.UtcNow.AddHours(1));

        var response = await Client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            email = "authflow.reset.wrong@example.com",
            token = "wrong-reset-token",
            newPassword = "NewP@ssw0rd!",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Equal("Invalid or expired reset token.", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task ResetPassword_WithExpiredToken_ReturnsBadRequest()
    {
        await SeedUserAsync(
            "authflow.reset.expired@example.com",
            resetToken: "expired-reset-token",
            resetExpiry: DateTime.UtcNow.AddHours(-1));

        var response = await Client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            email = "authflow.reset.expired@example.com",
            token = "expired-reset-token",
            newPassword = "NewP@ssw0rd!",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_ForUnknownEmail_ReturnsBadRequest()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            email = "authflow.reset.ghost@example.com",
            token = "some-reset-token",
            newPassword = "NewP@ssw0rd!",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_WithWeakPassword_ReturnsBadRequest()
    {
        await SeedUserAsync(
            "authflow.reset.weak@example.com",
            resetToken: "valid-reset-token",
            resetExpiry: DateTime.UtcNow.AddHours(1));

        var response = await Client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            email = "authflow.reset.weak@example.com",
            token = "valid-reset-token",
            newPassword = "123",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Logout / token revocation
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Logout_RevokesToken_SubsequentRequestsAreRejected()
    {
        var token = await RegisterLearnerAsync("authflow.logout.revoked@example.com");
        var authorized = AuthorizedClient(token);

        var before = await authorized.GetAsync("/api/courses");
        Assert.Equal(HttpStatusCode.OK, before.StatusCode);

        var logoutResponse = await authorized.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.OK, logoutResponse.StatusCode);
        var logoutBody = await ReadJsonAsync(logoutResponse);
        Assert.Equal("Logged out successfully", logoutBody.GetProperty("message").GetString());

        var after = await authorized.GetAsync("/api/courses");
        Assert.Equal(HttpStatusCode.Unauthorized, after.StatusCode);
        var afterBody = await ReadJsonAsync(after);
        Assert.Equal("Token has been revoked. Please log in again.", afterBody.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Logout_DoesNotAffectOtherUsersTokens()
    {
        var firstToken = await RegisterLearnerAsync("authflow.logout.first@example.com");
        var secondToken = await RegisterLearnerAsync("authflow.logout.second@example.com");

        var firstLogout = await AuthorizedClient(firstToken).PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.OK, firstLogout.StatusCode);

        var secondResponse = await AuthorizedClient(secondToken).GetAsync("/api/courses");
        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
    }

    [Fact]
    public async Task Logout_WithoutAuth_ReturnsUnauthorized()
    {
        var response = await Client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ------------------------------------------------------------------ //
    // Company registration
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task RegisterCompany_CreatesCompanyAndRecruiter_ReturnsToken()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/register-company", new
        {
            companyName = "Regression Corp",
            firstName = "Employer",
            lastName = "One",
            emailAddress = "authflow.company.valid@example.com",
            password = "P@ssw0rd!",
            address = "12 Cebu Business Park, Cebu City, Cebu 6000, Philippines",
            birthday = "1990-01-01",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.True(body.GetProperty("userId").GetInt32() > 0);
        Assert.True(body.GetProperty("companyId").GetInt32() > 0);
        Assert.Equal("Regression Corp", body.GetProperty("companyName").GetString());
        Assert.Equal("Recruiter", body.GetProperty("role").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("token").GetString()));

        await using var context = Factory.CreateDbContext();
        var user = await context.Users.SingleAsync(u => u.EmailAddress == "authflow.company.valid@example.com");
        Assert.Equal("Recruiter", user.Role);
        Assert.Equal("12 Cebu Business Park", user.Street);
        Assert.Equal("Cebu City", user.City);
        Assert.Equal("Cebu", user.Province);
        var company = await context.Companies.SingleAsync(c => c.Name == "Regression Corp");
        Assert.Equal(company.CompanyId, user.CompanyId);
    }

    [Fact]
    public async Task RegisterCompany_DuplicateEmail_ReturnsBadRequest()
    {
        var request = new
        {
            companyName = "Duplicate Email Corp",
            firstName = "Employer",
            lastName = "Two",
            emailAddress = "authflow.company.dupemail@example.com",
            password = "P@ssw0rd!",
        };

        var first = await Client.PostAsJsonAsync("/api/auth/register-company", request);
        first.EnsureSuccessStatusCode();

        var second = await Client.PostAsJsonAsync("/api/auth/register-company", new
        {
            companyName = "A Different Company",
            firstName = "Employer",
            lastName = "Two",
            emailAddress = "authflow.company.dupemail@example.com",
            password = "P@ssw0rd!",
        });

        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        var body = await ReadJsonAsync(second);
        Assert.Equal("Email already registered", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task RegisterCompany_DuplicateCompanyName_ReturnsBadRequest()
    {
        var request = new
        {
            companyName = "Unique Name Corp",
            firstName = "Employer",
            lastName = "Three",
            emailAddress = "authflow.company.dupname@example.com",
            password = "P@ssw0rd!",
        };

        var first = await Client.PostAsJsonAsync("/api/auth/register-company", request);
        first.EnsureSuccessStatusCode();

        var second = await Client.PostAsJsonAsync("/api/auth/register-company", new
        {
            companyName = "Unique Name Corp",
            firstName = "Employer",
            lastName = "Three",
            emailAddress = "authflow.company.dupname2@example.com",
            password = "P@ssw0rd!",
        });

        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        var body = await ReadJsonAsync(second);
        Assert.Equal("Company name already registered", body.GetProperty("error").GetString());
    }

    // ------------------------------------------------------------------ //
    // Helpers
    // ------------------------------------------------------------------ //

    private async Task SeedUserAsync(
        string email,
        string? confirmToken = null,
        DateTime? confirmExpiry = null,
        string? resetToken = null,
        DateTime? resetExpiry = null,
        bool emailConfirmed = false)
    {
        await using var context = Factory.CreateDbContext();
        context.Users.Add(new AppUser
        {
            FirstName = "Regression",
            LastName = "User",
            EmailAddress = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldP@ssw0rd!"),
            Role = "Learner",
            RemoteFriendly = true,
            EmailConfirmed = emailConfirmed,
            EmailConfirmationTokenHash = confirmToken == null ? null : HashToken(confirmToken),
            EmailConfirmationTokenExpiry = confirmExpiry,
            PasswordResetTokenHash = resetToken == null ? null : HashToken(resetToken),
            PasswordResetTokenExpiry = resetExpiry,
        });
        await context.SaveChangesAsync();
    }

    private static string HashToken(string raw)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}