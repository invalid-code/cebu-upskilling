using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
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
    private readonly IAppUserRepository _users;
    private readonly ILearnerRepository _learners;
    private readonly IRoleSkillRepository _roleSkills;
    private readonly ILearnerSkillRepository _learnerSkills;
    private readonly ISkillRepository _skills;
    private readonly IAssessmentQuestionRepository _assessmentQuestions;
    private readonly IOpenRouterService _openRouterService;
    private readonly IJwtTokenService _tokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IAppUserRepository users,
        ILearnerRepository learners,
        IRoleSkillRepository roleSkills,
        ILearnerSkillRepository learnerSkills,
        ISkillRepository skills,
        IAssessmentQuestionRepository assessmentQuestions,
        IOpenRouterService openRouterService,
        IJwtTokenService tokenService,
        ILogger<AuthService> logger)
    {
        _users = users;
        _learners = learners;
        _roleSkills = roleSkills;
        _learnerSkills = learnerSkills;
        _skills = skills;
        _assessmentQuestions = assessmentQuestions;
        _openRouterService = openRouterService;
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

        if (await _users.ExistsByEmailAsync(request.EmailAddress))
        {
            _logger.LogWarning("Registration failed: email {Email} already exists", request.EmailAddress);
            throw new InvalidOperationException("Email already registered");
        }

        if (request.Role == "Learner" && string.IsNullOrWhiteSpace(request.Resume))
        {
            _logger.LogWarning("Registration failed: resume required for learner {Email}", request.EmailAddress);
            throw new InvalidOperationException("Resume is required for learners");
        }

        var user = new AppUser
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            MiddleName = request.MiddleName,
            Birthday = request.Birthday.HasValue
    ? DateTime.SpecifyKind(request.Birthday.Value, DateTimeKind.Utc)
    : null,
            EmailAddress = request.EmailAddress,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            TargetRole = request.TargetRole,
            Address = request.Address,
        };

        await _users.AddAsync(user);
        await _users.SaveChangesAsync();
        _logger.LogInformation("User registered successfully: {UserId} ({Email}), Role: {Role}", user.UserId, user.EmailAddress, user.Role);

        if (request.Role == "Learner")
        {
            var learner = new Learner { UserId = user.UserId, IsPremium = false };
            await _learners.AddAsync(learner);
            await _learners.SaveChangesAsync();
            _logger.LogInformation("Learner profile created for user {UserId}", user.UserId);

            if (!string.IsNullOrWhiteSpace(request.TargetRole))
            {
                var roleSkills = await _roleSkills.GetByTargetRoleAsync(request.TargetRole);

                if (roleSkills.Count > 0)
                {
                    var learnerSkills = roleSkills.Select(rs => new LearnerSkill
                    {
                        LearnerId = learner.LearnerId,
                        SkillId = rs.SkillId,
                        CurrentLevel = 0,
                        Verified = false,
                    }).ToList();

                    _learnerSkills.AddRange(learnerSkills);
                    await _learnerSkills.SaveChangesAsync();
                    _logger.LogInformation("Created {Count} learner skills for user {UserId} (role: {Role})",
                        learnerSkills.Count, user.UserId, request.TargetRole);
                }
            }

            var resumeText = request.Resume ?? string.Empty;
            var extractedSkillNames = await _openRouterService.ParseSkillsFromResumeAsync(resumeText);
            var matchedSkills = extractedSkillNames.Count > 0
                ? await _skills.GetByNamesAsync(extractedSkillNames)
                : new List<Skill>();

            if (matchedSkills.Count > 0)
            {
                var existingSkillIds = (await _learnerSkills.GetByLearnerIdWithSkillAsync(learner.LearnerId))
                    .Select(ls => ls.SkillId).ToHashSet();

                var newLearnerSkills = matchedSkills
                    .Where(s => !existingSkillIds.Contains(s.SkillId))
                    .Select(s => new LearnerSkill
                    {
                        LearnerId = learner.LearnerId,
                        SkillId = s.SkillId,
                        CurrentLevel = 0,
                        Verified = false,
                    }).ToList();

                if (newLearnerSkills.Any())
                {
                    _learnerSkills.AddRange(newLearnerSkills);
                    await _learnerSkills.SaveChangesAsync();
                    _logger.LogInformation("Added {Count} resume-parsed skills for user {UserId}",
                        newLearnerSkills.Count, user.UserId);
                }

                await GenerateAssessmentsForSkillsAsync(matchedSkills, CancellationToken.None);
            }
        }

        var token = _tokenService.GenerateToken(user);

        return new AuthResponse(user.UserId, user.FirstName, user.LastName, user.EmailAddress, user.Role, user.TargetRole, user.Address, user.RemoteFriendly, token);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        _logger.LogInformation("Login attempt for email {Email}", request.EmailAddress);

        var user = await _users.GetByEmailAsync(request.EmailAddress);
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
        var user = await _users.GetByIdAsync(userId);
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

        await _users.SaveChangesAsync();
        _logger.LogInformation("Profile updated for user {UserId}", userId);

        var token = _tokenService.GenerateToken(user);
        return new AuthResponse(user.UserId, user.FirstName, user.LastName, user.EmailAddress, user.Role, user.TargetRole, user.Address, user.RemoteFriendly, token);
    }

    private async Task GenerateAssessmentsForSkillsAsync(List<Skill> skills, CancellationToken ct)
    {
        foreach (var skill in skills)
        {
            try
            {
                var generated = await _openRouterService.GenerateAssessmentQuestionsAsync(skill.Name, 5, ct);
                if (generated.Count == 0)
                {
                    _logger.LogDebug("No AI assessment questions generated for skill {Skill}", skill.Name);
                    continue;
                }

                var questions = generated.Select(q => new AssessmentQuestion
                {
                    SkillId = skill.SkillId,
                    Text = q.Text.Trim(),
                    OptionA = q.OptionA.Trim(),
                    OptionB = q.OptionB.Trim(),
                    OptionC = q.OptionC.Trim(),
                    OptionD = q.OptionD.Trim(),
                    CorrectOption = q.CorrectOption,
                    Source = AssessmentSource.AI,
                }).ToList();

                _assessmentQuestions.AddRange(questions);
                await _assessmentQuestions.SaveChangesAsync(ct);

                _logger.LogInformation("Generated {Count} AI assessment questions for skill {Skill} during registration",
                    questions.Count, skill.Name);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to generate assessment questions for skill {Skill} during registration", skill.Name);
            }
        }
    }
}
