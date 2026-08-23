namespace CebuUpskilling.Backend.DTOs;

using System.ComponentModel.DataAnnotations;

public record CompanyResponse(
    int CompanyId,
    string Name,
    string? Tagline,
    string? LogoUrl,
    string? CoverImageUrl,
    string? Description,
    string? Industry,
    string? Website,
    string? LinkedInUrl,
    string? FacebookUrl,
    string? Location,
    string? CompanySize,
    int ProfileCompleteness
);

public record CreateCompanyRequest(
    [Required] string Name,
    string? Tagline = null,
    string? Description = null,
    string? Industry = null,
    string? Website = null,
    string? LinkedInUrl = null,
    string? FacebookUrl = null,
    string? Location = null,
    string? CompanySize = null
);

public record UpdateCompanyRequest(
    string? Name = null,
    string? Tagline = null,
    string? Description = null,
    string? Industry = null,
    string? Website = null,
    string? LinkedInUrl = null,
    string? FacebookUrl = null,
    string? Location = null,
    string? CompanySize = null
);

public record UploadLogoResponse(string LogoUrl);