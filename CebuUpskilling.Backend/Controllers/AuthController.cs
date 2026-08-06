using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        _logger.LogInformation("POST /api/auth/register called for {Email}", request.EmailAddress);
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

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        _logger.LogInformation("POST /api/auth/login called for {Email}", request.EmailAddress);
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

    [Authorize]
    [HttpPatch("profile")]
    public async Task<ActionResult<AuthResponse>> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        _logger.LogInformation("PATCH /api/auth/profile called for UserId: {UserId}", userId);
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
}
