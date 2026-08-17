using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
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
        var jwtKey = _config["Jwt:Key"] ?? throw new InvalidOperationException(
            "Jwt:Key is not configured. Set Jwt:Key in appsettings.json or the Jwt__Key environment variable.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
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
    Task<CompanyRegisterResponse> CompanyRegisterAsync(CompanyRegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request);
}

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly ISkillParsingService _skillParsingService;
    private readonly IJwtTokenService _tokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        ApplicationDbContext context,
        ISkillParsingService skillParsingService,
        IJwtTokenService tokenService,
        ILogger<AuthService> logger)
    {
        _context = context;
        _skillParsingService = skillParsingService;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        _logger.LogInformation("Registration attempt for email {Email}", request.EmailAddress);

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            _logger.LogWarning("Registration failed: weak password for email {Email}", request.EmailAddress);
            throw new InvalidOperationException("Password must be at least 6 characters long");
        }

        if (request.Role != "Learner" && request.Role != "Recruiter")
        {
            _logger.LogWarning("Registration failed: role '{Role}' is not allowed", request.Role);
            throw new InvalidOperationException($"Role '{request.Role}' is not allowed");
        }

        if (request.Role == "Learner" && string.IsNullOrWhiteSpace(request.Resume))
        {
            _logger.LogWarning("Registration failed: learner resume is required for email {Email}", request.EmailAddress);
            throw new InvalidOperationException("Resume is required for learners");
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
            Birthday = ParseBirthday(request.Birthday),
            EmailAddress = request.EmailAddress,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            TargetRole = request.TargetRole,
            Address = request.Address,
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _logger.LogInformation("User registered successfully: {UserId} ({Email}), Role: {Role}", user.UserId, user.EmailAddress, user.Role);

        ParseSkillsResult? parseResult = null;

        if (request.Role == "Learner")
        {
            var learner = new Learner { UserId = user.UserId, IsPremium = false };
            _context.Learners.Add(learner);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Learner profile created for user {UserId}", user.UserId);

            var resumeText = request.Resume ?? string.Empty;
            try
            {
                parseResult = await _skillParsingService.ParseAndCreateAssessmentsAsync(user.UserId, resumeText, CancellationToken.None);
                _logger.LogInformation("Auto-parsed resume skills and created assessments for user {UserId}", user.UserId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Resume skill parsing failed during registration for user {UserId}", user.UserId);
            }
        }

        var token = _tokenService.GenerateToken(user);

        return new AuthResponse(
            user.UserId,
            user.FirstName,
            user.LastName,
            user.EmailAddress,
            user.Role,
            user.TargetRole,
            user.Address,
            user.RemoteFriendly,
            token,
            parseResult?.Skills.Count ?? 0,
            parseResult?.Skills.Count(s => s.AssessmentId != null) ?? 0);
    }

    public async Task<CompanyRegisterResponse> CompanyRegisterAsync(CompanyRegisterRequest request)
    {
        _logger.LogInformation("Company registration attempt for email {Email}, company {CompanyName}", request.EmailAddress, request.CompanyName);

        if (await _context.Users.AnyAsync(u => u.EmailAddress == request.EmailAddress))
        {
            _logger.LogWarning("Company registration failed: email {Email} already exists", request.EmailAddress);
            throw new InvalidOperationException("Email already registered");
        }

        if (await _context.Companies.AnyAsync(c => c.Name == request.CompanyName))
        {
            _logger.LogWarning("Company registration failed: company name {CompanyName} already exists", request.CompanyName);
            throw new InvalidOperationException("Company name already registered");
        }

        // Transactions are only supported by relational databases (e.g. PostgreSQL).
        // Skip the transaction for non-relational providers like the in-memory test database.
        IDbContextTransaction? transaction = null;
        if (_context.Database.ProviderName != "Microsoft.EntityFrameworkCore.InMemory")
        {
            transaction = await _context.Database.BeginTransactionAsync();
        }

        try
        {
            var company = new Company { Name = request.CompanyName };
            _context.Companies.Add(company);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Company created: {CompanyId} ({CompanyName})", company.CompanyId, company.Name);

            var user = new AppUser
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                MiddleName = request.MiddleName,
                Birthday = ParseBirthday(request.Birthday),
                EmailAddress = request.EmailAddress,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = "Recruiter",
                Address = request.Address,
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Recruiter user registered: {UserId} ({Email})", user.UserId, user.EmailAddress);

            var recruiter = new Recruiter
            {
                UserId = user.UserId,
                CompanyId = company.CompanyId,
            };
            _context.Recruiters.Add(recruiter);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Recruiter profile created: {RecruiterId} for user {UserId}, company {CompanyId}", recruiter.RecruiterId, user.UserId, company.CompanyId);

            if (transaction != null)
                await transaction.CommitAsync();

            var token = _tokenService.GenerateToken(user);

            return new CompanyRegisterResponse(
                user.UserId,
                user.FirstName,
                user.LastName,
                user.EmailAddress,
                user.Role,
                company.CompanyId,
                company.Name,
                token
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Company registration transaction failed for email {Email}, company {CompanyName}", request.EmailAddress, request.CompanyName);
            if (transaction != null)
                await transaction.RollbackAsync();
            throw;
        }
        finally
        {
            transaction?.Dispose();
        }
    }

    private static DateTime? ParseBirthday(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return DateTime.TryParse(value, out var parsed) ? parsed : null;
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
        _logger.LogInformation("Profile update attempt for user {UserId}", userId);

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            _logger.LogWarning("Profile update failed: user {UserId} not found", userId);
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
