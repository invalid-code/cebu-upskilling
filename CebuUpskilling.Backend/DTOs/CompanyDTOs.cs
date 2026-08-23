namespace CebuUpskilling.Backend.DTOs;

using System.ComponentModel.DataAnnotations;

public record CompanyResponse(
    int CompanyId,
    string Name,
    string? LogoUrl,
    string? Description,
    string? Industry,
    string? Website,
    string? Location,
    string? CompanySize
);

public record CreateCompanyRequest(
    [Required] string Name,
    string? Description = null,
    string? Industry = null,
    string? Website = null,
    string? Location = null,
    string? CompanySize = null
);

public record UpdateCompanyRequest(
    string? Name = null,
    string? Description = null,
    string? Industry = null,
    string? Website = null,
    string? Location = null,
    string? CompanySize = null
);

public record UploadLogoResponse(string LogoUrl);
