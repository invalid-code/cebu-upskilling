using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CebuUpskilling.Backend.Controllers;

public class AuthController : BaseEntityController<AppUser>
{
    private readonly IAuthService _authService;

    public AuthController(IEntityService<AppUser> service, IAuthService authService, ILogger<AuthController> logger)
        : base(service, logger, "Auth")
    {
        _authService = authService;
    }

    protected override int GetId(AppUser entity) => entity.UserId;

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        _logger.LogInformation("HTTP POST /api/auth/register called for {Email}", request.EmailAddress);
        try
        {
            var result = await _authService.RegisterAsync(request);
            _logger.LogInformation("Registration successful for {Email}, UserId: {UserId}", request.EmailAddress, result.UserId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Registration failed for {Email}: {Error}", request.EmailAddress, ex.Message);
            return BadRequest(new { error = ex.Message });
        }
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("register-company")]
    public async Task<ActionResult<CompanyRegisterResponse>> RegisterCompany(CompanyRegisterRequest request)
    {
        _logger.LogInformation("POST /api/auth/register-company called for {Email}, company {CompanyName}", request.EmailAddress, request.CompanyName);
        try
        {
            var result = await _authService.CompanyRegisterAsync(request);
            _logger.LogInformation("Company registration successful for {Email}, UserId: {UserId}, CompanyId: {CompanyId}", request.EmailAddress, result.UserId, result.CompanyId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Company registration failed for {Email}: {Error}", request.EmailAddress, ex.Message);
            return BadRequest(new { error = ex.Message });
        }
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        _logger.LogInformation("HTTP POST /api/auth/login called for {Email}", request.EmailAddress);
        try
        {
            var result = await _authService.LoginAsync(request);
            _logger.LogInformation("Login successful for {Email}, UserId: {UserId}", request.EmailAddress, result.UserId);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            _logger.LogWarning("Login failed for {Email}: invalid credentials", request.EmailAddress);
            return Unauthorized(new { error = "Invalid credentials" });
        }
    }

    [HttpPatch("profile")]
    public async Task<ActionResult<AuthResponse>> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("HTTP PATCH /api/auth/profile called by user {UserId}", userId);
        try
        {
            var result = await _authService.UpdateProfileAsync(userId, request);
            _logger.LogInformation("Profile updated for UserId: {UserId}", userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Profile update failed for UserId: {UserId}: {Error}", userId, ex.Message);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var jti = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value
                  ?? User.FindFirst("jti")?.Value;
        await _authService.LogoutAsync(jti);
        _logger.LogInformation("User logged out (JTI revoked)");
        return Ok(new { message = "Logged out successfully" });
    }

    [AllowAnonymous]
    [HttpPost("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailRequest request)
    {
        var confirmed = await _authService.ConfirmEmailAsync(request.Email, request.Token);
        if (!confirmed)
        {
            return BadRequest(new { error = "Invalid or expired confirmation token." });
        }

        return Ok(new { message = "Email confirmed successfully." });
    }

    [AllowAnonymous]
    [HttpPost("resend-confirmation")]
    public async Task<IActionResult> ResendConfirmation([FromBody] EmailRequest request)
    {
        await _authService.SendEmailConfirmationAsync(request.Email);
        return Ok(new { message = "If the account exists, a confirmation email has been sent." });
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] EmailRequest request)
    {
        await _authService.SendPasswordResetAsync(request.Email);
        return Ok(new { message = "If the account exists, a password reset email has been sent." });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var reset = await _authService.ResetPasswordAsync(request.Email, request.Token, request.NewPassword);
        if (!reset)
        {
            return BadRequest(new { error = "Invalid or expired reset token." });
        }

        return Ok(new { message = "Password has been reset. You can now log in." });
    }
}
