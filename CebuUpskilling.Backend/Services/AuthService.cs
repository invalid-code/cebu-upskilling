using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
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
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
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

    Task LogoutAsync(string? jti);
    Task SendEmailConfirmationAsync(string email);
    Task<bool> ConfirmEmailAsync(string email, string token);
    Task SendPasswordResetAsync(string email);
    Task<bool> ResetPasswordAsync(string email, string token, string newPassword);
}

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly ISkillParsingService _skillParsingService;
    private readonly IJwtTokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly ITokenRevocationStore _revocationStore;
    private readonly ILogger<AuthService> _logger;

    private const string FrontendBaseUrl = "http://localhost:5173";

    public AuthService(
        ApplicationDbContext context,
        ISkillParsingService skillParsingService,
        IJwtTokenService tokenService,
        IEmailService emailService,
        ITokenRevocationStore revocationStore,
        ILogger<AuthService> logger)
    {
        _context = context;
        _skillParsingService = skillParsingService;
        _tokenService = tokenService;
        _emailService = emailService;
        _revocationStore = revocationStore;
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

        var addressParts = AddressParser.Parse(request.Address);

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
            Street = addressParts.Street,
            City = addressParts.City,
            Province = addressParts.Province,
            ZipCode = addressParts.ZipCode,
            Country = addressParts.Country,
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

        try
        {
            await SendConfirmationEmailAsync(user);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send confirmation email after registration for user {UserId}", user.UserId);
        }

        var token = _tokenService.GenerateToken(user);

        return BuildAuthResponse(
            user,
            token,
            parseResult?.Skills.Count ?? 0,
            parseResult?.Skills.Count(s => s.AssessmentId != null) ?? 0,
            user.CompanyId,
            user.Company?.Name);
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

            var addressParts = AddressParser.Parse(request.Address);

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
                Street = addressParts.Street,
                City = addressParts.City,
                Province = addressParts.Province,
                ZipCode = addressParts.ZipCode,
                Country = addressParts.Country,
                CompanyId = company.CompanyId,
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Recruiter user registered: {UserId} ({Email})", user.UserId, user.EmailAddress);

            if (transaction != null)
                await transaction.CommitAsync();

            try
            {
                await SendConfirmationEmailAsync(user);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send confirmation email after company registration for user {UserId}", user.UserId);
            }

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

        DateTime? parsed = DateTime.TryParse(value, out var date) ? date : null;
        if (parsed == null)
        {
            return null;
        }

        // The Birthday column maps to "timestamp with time zone"; Npgsql requires
        // a UTC DateTime. Date-only inputs parse as Kind=Unspecified, so pin them
        // to UTC and normalize any local values.
        return parsed.Value.Kind == DateTimeKind.Utc
            ? parsed
            : DateTime.SpecifyKind(parsed.Value.ToUniversalTime(), DateTimeKind.Utc);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        _logger.LogInformation("Login attempt for email {Email}", request.EmailAddress);

        var user = await _context.Users
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.EmailAddress == request.EmailAddress);
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

        return BuildAuthResponse(user, token, companyId: user.CompanyId, companyName: user.Company?.Name);
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
            var addressParts = AddressParser.Parse(request.Address);
            user.Street = addressParts.Street;
            user.City = addressParts.City;
            user.Province = addressParts.Province;
            user.ZipCode = addressParts.ZipCode;
            user.Country = addressParts.Country;
        }

        if (request.RemoteFriendly.HasValue)
        {
            user.RemoteFriendly = request.RemoteFriendly.Value;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Profile updated for user {UserId}", userId);

        var token = _tokenService.GenerateToken(user);
        return BuildAuthResponse(user, token, companyId: user.CompanyId, companyName: user.Company?.Name);
    }

    public Task LogoutAsync(string? jti)
    {
        if (!string.IsNullOrEmpty(jti))
        {
            _revocationStore.Revoke(jti, DateTime.UtcNow.AddDays(8));
        }

        return Task.CompletedTask;
    }

    public async Task SendEmailConfirmationAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailAddress == email);
        if (user == null || user.EmailConfirmed)
        {
            return;
        }

        await SendConfirmationEmailAsync(user);
    }

    public async Task<bool> ConfirmEmailAsync(string email, string token)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailAddress == email);
        if (user == null || user.EmailConfirmed)
        {
            return user?.EmailConfirmed ?? false;
        }

        if (string.IsNullOrWhiteSpace(token)
            || user.EmailConfirmationTokenHash == null
            || user.EmailConfirmationTokenExpiry == null
            || user.EmailConfirmationTokenExpiry < DateTime.UtcNow)
        {
            return false;
        }

        if (!TokenMatches(token, user.EmailConfirmationTokenHash))
        {
            return false;
        }

        user.EmailConfirmed = true;
        user.EmailConfirmationTokenHash = null;
        user.EmailConfirmationTokenExpiry = null;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task SendPasswordResetAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailAddress == email);
        if (user == null)
        {
            return;
        }

        var token = GenerateSecureToken();
        user.PasswordResetTokenHash = HashToken(token);
        user.PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(30);
        await _context.SaveChangesAsync();

        var resetUrl = $"{FrontendBaseUrl}/reset-password?email={Uri.EscapeDataString(user.EmailAddress)}&token={token}";
        var body = $"<p>We received a request to reset your password.</p>" +
                   $"<p>Your password reset token is: <strong>{token}</strong></p>" +
                   $"<p>Or open this link: <a href=\"{resetUrl}\">{resetUrl}</a></p>" +
                   $"<p>If you did not request this, you can safely ignore this email.</p>";
        await SafeSendEmailAsync(user.EmailAddress, "Reset your password - Cebu Upskilling", body);
    }

    public async Task<bool> ResetPasswordAsync(string email, string token, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 6)
        {
            return false;
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailAddress == email);
        if (user == null
            || string.IsNullOrWhiteSpace(token)
            || user.PasswordResetTokenHash == null
            || user.PasswordResetTokenExpiry == null
            || user.PasswordResetTokenExpiry < DateTime.UtcNow)
        {
            return false;
        }

        if (!TokenMatches(token, user.PasswordResetTokenHash))
        {
            return false;
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.PasswordResetTokenHash = null;
        user.PasswordResetTokenExpiry = null;
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task SafeSendEmailAsync(string to, string subject, string htmlBody)
    {
        try
        {
            await _emailService.SendEmailAsync(to, subject, htmlBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To} (subject: {Subject})", to, subject);
        }
    }

    private async Task SendConfirmationEmailAsync(AppUser user)
    {
        var token = GenerateSecureToken();
        user.EmailConfirmationTokenHash = HashToken(token);
        user.EmailConfirmationTokenExpiry = DateTime.UtcNow.AddHours(24);
        await _context.SaveChangesAsync();

        var confirmUrl = $"{FrontendBaseUrl}/confirm-email?email={Uri.EscapeDataString(user.EmailAddress)}&token={token}";
        var body = $"<p>Welcome to Cebu Upskilling! Please confirm your email address.</p>" +
                   $"<p>Your confirmation token is: <strong>{token}</strong></p>" +
                   $"<p>Or open this link: <a href=\"{confirmUrl}\">{confirmUrl}</a></p>";
        await SafeSendEmailAsync(user.EmailAddress, "Confirm your email - Cebu Upskilling", body);
    }

    private static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static bool TokenMatches(string rawToken, string storedHash)
    {
        var rawHash = HashToken(rawToken);
        var storedBytes = Convert.FromHexString(storedHash);
        var rawBytes = Convert.FromHexString(rawHash);
        if (rawBytes.Length != storedBytes.Length)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(rawBytes, storedBytes);
    }

    private static AuthResponse BuildAuthResponse(
        AppUser user,
        string token,
        int parsedSkillCount = 0,
        int assessmentCount = 0,
        int? companyId = null,
        string? companyName = null) =>
        new(
            user.UserId,
            user.FirstName,
            user.LastName,
            user.EmailAddress,
            user.Role,
            user.TargetRole,
            user.Address,
            user.Street,
            user.City,
            user.Province,
            user.ZipCode,
            user.Country,
            user.RemoteFriendly,
            token,
            parsedSkillCount,
            assessmentCount,
            companyId,
            companyName
        );
}