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
        => _postService.SearchAsync(new PostQueryParams { CompanyId = companyId, SortBy = "newest" });

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
            Description = request.Description,
            Industry = request.Industry,
            Website = request.Website,
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

        if (request.Description != null) company.Description = request.Description;
        if (request.Industry != null) company.Industry = request.Industry;
        if (request.Website != null) company.Website = request.Website;
        if (request.Location != null) company.Location = request.Location;
        if (request.CompanySize != null) company.CompanySize = request.CompanySize;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Company profile updated: {CompanyId}", company.CompanyId);

        return ToResponse(company);
    }

    public async Task<string> UploadLogoAsync(int userId, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            throw new InvalidOperationException("Logo file is required");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension) || !AllowedLogoExtensions.Contains(extension))
        {
            throw new InvalidOperationException("Logo must be a PNG, JPG or WEBP image");
        }

        if (file.Length > MaxLogoBytes)
        {
            throw new InvalidOperationException("Logo must be 2 MB or smaller");
        }

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId);
        if (user?.CompanyId == null)
        {
            throw new KeyNotFoundException($"No company is linked to user {userId}");
        }

        var companyId = user.CompanyId.Value;
        var key = $"company-logos/{companyId}/{Guid.NewGuid()}{extension}";

        await using var stream = file.OpenReadStream();
        var publicUrl = await _storage.UploadAsync(key, stream, file.ContentType, CancellationToken.None);

        await DeletePreviousLogoAsync(user, key);

        var company = await _context.Companies.FirstAsync(c => c.CompanyId == companyId);
        company.LogoUrl = publicUrl;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Uploaded logo for company {CompanyId} to {Key}", companyId, key);
        return publicUrl;
    }

    private async Task DeletePreviousLogoAsync(AppUser user, string newKey)
    {
        var previousUrl = await _context.Companies
            .Where(c => c.CompanyId == user.CompanyId!.Value)
            .Select(c => c.LogoUrl)
            .FirstOrDefaultAsync();

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
            company.LogoUrl,
            company.Description,
            company.Industry,
            company.Website,
            company.Location,
            company.CompanySize);
}
