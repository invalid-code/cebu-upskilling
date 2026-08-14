using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

    [AllowAnonymous]
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

    [HttpPatch("profile")]
    public async Task<ActionResult<AuthResponse>> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
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
