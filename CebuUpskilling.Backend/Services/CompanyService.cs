using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Services;

public interface ICompanyService
{
    Task<List<CompanyResponse>> GetAllAsync();
    Task<CompanyResponse?> GetByIdAsync(int companyId);
    Task<PagedPostsResponse> GetPostsAsync(int companyId);
    Task<CompanyResponse> CreateAsync(CreateCompanyRequest request);
    Task<CompanyResponse> UpdateForUserAsync(int userId, UpdateCompanyRequest request);
    Task<string> UploadLogoAsync(int userId, IFormFile file);
    Task<string> UploadCoverAsync(int userId, IFormFile file);
}

public class CompanyService : ICompanyService
{
    private const int MaxLogoBytes = 2 * 1024 * 1024;
    private static readonly string[] AllowedLogoExtensions = [".png", ".jpg", ".jpeg", ".webp"];

    private readonly ApplicationDbContext _context;
    private readonly IPostService _postService;
    private readonly IObjectStorageService _storage;
    private readonly ILogger<CompanyService> _logger;

    public CompanyService(
        ApplicationDbContext context,
        IPostService postService,
        IObjectStorageService storage,
        ILogger<CompanyService> logger)
    {
        _context = context;
        _postService = postService;
        _storage = storage;
        _logger = logger;
    }

    public async Task<List<CompanyResponse>> GetAllAsync()
    {
        var companies = await _context.Companies
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ToListAsync();
        return companies.Select(ToResponse).ToList();
    }

    public async Task<CompanyResponse?> GetByIdAsync(int companyId)
    {
        var company = await _context.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CompanyId == companyId);
        return company == null ? null : ToResponse(company);
    }

    public Task<PagedPostsResponse> GetPostsAsync(int companyId)
        => _postService.SearchAsync(new PostQueryParams { CompanyId = companyId, IsActive = true, SortBy = "newest" });

    public async Task<CompanyResponse> CreateAsync(CreateCompanyRequest request)
    {
        var name = request.Name.Trim();
        if (await _context.Companies.AnyAsync(c => c.Name == name))
        {
            _logger.LogWarning("Company creation failed: name {CompanyName} already exists", name);
            throw new InvalidOperationException("Company name already registered");
        }

        var company = new Company
        {
            Name = name,
            Tagline = request.Tagline,
            Description = request.Description,
            Industry = request.Industry,
            Website = request.Website,
            LinkedInUrl = request.LinkedInUrl,
            FacebookUrl = request.FacebookUrl,
            Location = request.Location,
            CompanySize = request.CompanySize,
        };

        _context.Companies.Add(company);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Company created: {CompanyId} ({CompanyName})", company.CompanyId, company.Name);

        return ToResponse(company);
    }

    public async Task<CompanyResponse> UpdateForUserAsync(int userId, UpdateCompanyRequest request)
    {
        var user = await _context.Users.Include(u => u.Company).FirstOrDefaultAsync(u => u.UserId == userId);
        if (user?.CompanyId == null || user.Company == null)
        {
            throw new KeyNotFoundException($"No company is linked to user {userId}");
        }

        var company = await _context.Companies.FirstAsync(c => c.CompanyId == user.Company.CompanyId);

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            var newName = request.Name.Trim();
            if (!string.Equals(newName, company.Name, StringComparison.Ordinal)
                && await _context.Companies.AnyAsync(c => c.Name == newName))
            {
                throw new InvalidOperationException("Company name already registered");
            }
            company.Name = newName;
        }

        // Empty string means "clear this field"; null means "leave unchanged".
        company.Tagline = ApplyUpdate(company.Tagline, request.Tagline);
        company.Description = ApplyUpdate(company.Description, request.Description);
        company.Industry = ApplyUpdate(company.Industry, request.Industry);
        company.Website = ApplyUpdate(company.Website, request.Website);
        company.LinkedInUrl = ApplyUpdate(company.LinkedInUrl, request.LinkedInUrl);
        company.FacebookUrl = ApplyUpdate(company.FacebookUrl, request.FacebookUrl);
        company.Location = ApplyUpdate(company.Location, request.Location);
        company.CompanySize = ApplyUpdate(company.CompanySize, request.CompanySize);

        await _context.SaveChangesAsync();
        _logger.LogInformation("Company profile updated: {CompanyId}", company.CompanyId);

        return ToResponse(company);
    }

    public Task<string> UploadLogoAsync(int userId, IFormFile file)
        => UploadImageAsync(userId, file, "company-logos", static c => c.LogoUrl, static (c, url) => c.LogoUrl = url);

    public Task<string> UploadCoverAsync(int userId, IFormFile file)
        => UploadImageAsync(userId, file, "company-covers", static c => c.CoverImageUrl, static (c, url) => c.CoverImageUrl = url);

    private async Task<string> UploadImageAsync(
        int userId,
        IFormFile file,
        string folder,
        Func<Company, string?> existingUrlSelector,
        Action<Company, string> applyUrl)
    {
        if (file == null || file.Length == 0)
        {
            throw new InvalidOperationException("Image file is required");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension) || !AllowedLogoExtensions.Contains(extension))
        {
            throw new InvalidOperationException("Image must be a PNG, JPG or WEBP file");
        }

        if (file.Length > MaxLogoBytes)
        {
            throw new InvalidOperationException("Image must be 2 MB or smaller");
        }

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId);
        if (user?.CompanyId == null)
        {
            throw new KeyNotFoundException($"No company is linked to user {userId}");
        }

        var companyId = user.CompanyId.Value;
        var key = $"{folder}/{companyId}/{Guid.NewGuid()}{extension}";

        await using var stream = file.OpenReadStream();
        var publicUrl = await _storage.UploadAsync(key, stream, file.ContentType, CancellationToken.None);

        var company = await _context.Companies.FirstAsync(c => c.CompanyId == companyId);
        await DeletePreviousImageAsync(existingUrlSelector(company), key);
        applyUrl(company, publicUrl);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Uploaded {Folder} image for company {CompanyId} to {Key}", folder, companyId, key);
        return publicUrl;
    }

    private async Task DeletePreviousImageAsync(string? previousUrl, string newKey)
    {
        if (string.IsNullOrWhiteSpace(previousUrl))
        {
            return;
        }

        var previousKey = TryExtractStorageKey(previousUrl);
        if (previousKey == null || string.Equals(previousKey, newKey, StringComparison.Ordinal))
        {
            return;
        }

        try
        {
            await _storage.DeleteAsync(previousKey, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete previous logo object {Key}; continuing", previousKey);
        }
    }

    /// <summary>
    /// null keeps the current value (field not sent); empty/whitespace clears the field;
    /// otherwise the trimmed incoming value replaces it.
    /// </summary>
    private static string? ApplyUpdate(string? current, string? incoming)
        => incoming == null ? current : (string.IsNullOrWhiteSpace(incoming) ? null : incoming.Trim());

    /// <summary>
    /// Best-effort reverse of <see cref="IObjectStorageService.GetPublicUrl"/> so superseded
    /// logo objects can be cleaned up. Only URLs produced by our own storage service are
    /// recognized; anything else (e.g. externally hosted images) returns null and is left alone.
    /// </summary>
    private static string? TryExtractStorageKey(string publicUrl)
    {
        foreach (var prefix in new[] { "/uploads/", "uploads/" })
        {
            var idx = publicUrl.IndexOf(prefix, StringComparison.Ordinal);
            if (idx >= 0)
            {
                return publicUrl[(idx + prefix.Length)..];
            }
        }

        if (Uri.TryCreate(publicUrl, UriKind.Absolute, out var uri))
        {
            var path = uri.AbsolutePath.TrimStart('/');
            return path.Length > 0 && path.Contains('/') ? path : null;
        }

        return null;
    }

    private static CompanyResponse ToResponse(Company company)
        => new(
            company.CompanyId,
            company.Name,
            company.Tagline,
            company.LogoUrl,
            company.CoverImageUrl,
            company.Description,
            company.Industry,
            company.Website,
            company.LinkedInUrl,
            company.FacebookUrl,
            company.Location,
            company.CompanySize,
            ComputeCompleteness(company));

    /// <summary>
    /// Percentage (0-100) of optional identity fields filled in; each of the ten
    /// fields is worth 10 points and counts when non-blank.
    /// </summary>
    private static int ComputeCompleteness(Company company)
    {
        string?[] fields =
        [
            company.Tagline,
            company.LogoUrl,
            company.CoverImageUrl,
            company.Description,
            company.Industry,
            company.Website,
            company.LinkedInUrl,
            company.FacebookUrl,
            company.Location,
            company.CompanySize,
        ];
        return fields.Count(static f => !string.IsNullOrWhiteSpace(f)) * 10;
    }
}
