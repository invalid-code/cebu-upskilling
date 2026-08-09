using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CebuUpskilling.Backend.Services;

public interface IJwtTokenService
{
    string GenerateToken(AppUser user);
}

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _config;
    private readonly ILogger<JwtTokenService> _logger;

    public JwtTokenService(IConfiguration config, ILogger<JwtTokenService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public string GenerateToken(AppUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Email, user.EmailAddress),
            new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        _logger.LogDebug("JWT token generated for user {UserId} ({Email})", user.UserId, user.EmailAddress);
        return tokenString;
    }
}

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request);
}

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IJwtTokenService _tokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(ApplicationDbContext context, IJwtTokenService tokenService, ILogger<AuthService> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        _logger.LogInformation("Registration attempt for email {Email}", request.EmailAddress);

        if (request.Role != "Learner" && request.Role != "Recruiter")
        {
            _logger.LogWarning("Registration failed: role '{Role}' is not allowed", request.Role);
            throw new InvalidOperationException($"Role '{request.Role}' is not allowed");
        }

        if (await _context.Users.AnyAsync(u => u.EmailAddress == request.EmailAddress))
        {
            _logger.LogWarning("Registration failed: email {Email} already exists", request.EmailAddress);
            throw new InvalidOperationException("Email already registered");
        }

        var user = new AppUser
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            MiddleName = request.MiddleName,
            Birthday = request.Birthday,
            EmailAddress = request.EmailAddress,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            TargetRole = request.TargetRole,
            Address = request.Address,
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _logger.LogInformation("User registered successfully: {UserId} ({Email}), Role: {Role}", user.UserId, user.EmailAddress, user.Role);

        if (request.Role == "Learner")
        {
            var learner = new Learner { UserId = user.UserId, IsPremium = false };
            _context.Learners.Add(learner);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Learner profile created for user {UserId}", user.UserId);

            if (!string.IsNullOrWhiteSpace(request.TargetRole))
            {
                var roleSkills = await _context.RoleSkills
                    .Where(rs => rs.TargetRole == request.TargetRole)
                    .ToListAsync();

                if (roleSkills.Count > 0)
                {
                    var learnerSkills = roleSkills.Select(rs => new LearnerSkill
                    {
                        LearnerId = learner.LearnerId,
                        SkillId = rs.SkillId,
                        CurrentLevel = 0,
                        Verified = false,
                    }).ToList();

                    _context.LearnerSkills.AddRange(learnerSkills);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Created {Count} learner skills for user {UserId} (role: {Role})",
                        learnerSkills.Count, user.UserId, request.TargetRole);
                }
            }
        }

        var token = _tokenService.GenerateToken(user);

        return new AuthResponse(user.UserId, user.FirstName, user.LastName, user.EmailAddress, user.Role, user.TargetRole, user.Address, user.RemoteFriendly, token);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        _logger.LogInformation("Login attempt for email {Email}", request.EmailAddress);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailAddress == request.EmailAddress);
        if (user == null)
        {
            _logger.LogWarning("Login failed: user not found for email {Email}", request.EmailAddress);
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Login failed: invalid password for user {UserId} ({Email})", user.UserId, user.EmailAddress);
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        _logger.LogInformation("User logged in successfully: {UserId} ({Email}), Role: {Role}", user.UserId, user.EmailAddress, user.Role);

        var token = _tokenService.GenerateToken(user);

        return new AuthResponse(user.UserId, user.FirstName, user.LastName, user.EmailAddress, user.Role, user.TargetRole, user.Address, user.RemoteFriendly, token);  
    }

    public async Task<AuthResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

        if (request.TargetRole != null)
        {
            user.TargetRole = request.TargetRole;
        }

        if (request.Address != null)
        {
            user.Address = request.Address;
        }

        if (request.RemoteFriendly.HasValue)
        {
            user.RemoteFriendly = request.RemoteFriendly.Value;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Profile updated for user {UserId}", userId);

        var token = _tokenService.GenerateToken(user);
        return new AuthResponse(user.UserId, user.FirstName, user.LastName, user.EmailAddress, user.Role, user.TargetRole, user.Address, user.RemoteFriendly, token);
    }
}
