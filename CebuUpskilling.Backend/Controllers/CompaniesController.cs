using System.Security.Claims;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/companies")]
public class CompaniesController : ControllerBase
{
    private readonly ICompanyService _companyService;
    private readonly ILogger<CompaniesController> _logger;

    public CompaniesController(ICompanyService companyService, ILogger<CompaniesController> logger)
    {
        _companyService = companyService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        _logger.LogInformation("HTTP GET /api/companies requested");
        var companies = await _companyService.GetAllAsync();
        _logger.LogInformation("Returning {Count} companies", companies.Count);
        return Ok(companies);
    }

    [HttpGet("{companyId:int}")]
    public async Task<IActionResult> GetById(int companyId)
    {
        _logger.LogInformation("HTTP GET /api/companies/{CompanyId} requested", companyId);
        var company = await _companyService.GetByIdAsync(companyId);
        if (company == null)
        {
            return NotFound(new { error = $"Company {companyId} not found" });
        }

        return Ok(company);
    }

    [HttpGet("{companyId:int}/posts")]
    public async Task<IActionResult> GetPosts(int companyId)
    {
        _logger.LogInformation("HTTP GET /api/companies/{CompanyId}/posts requested", companyId);
        var company = await _companyService.GetByIdAsync(companyId);
        if (company == null)
        {
            return NotFound(new { error = $"Company {companyId} not found" });
        }

        var posts = await _companyService.GetPostsAsync(companyId);
        return Ok(posts);
    }

    [HttpPost]
    [Authorize(Roles = "Recruiter")]
    public async Task<IActionResult> Create(CreateCompanyRequest request)
    {
        _logger.LogInformation("HTTP POST /api/companies to create company {CompanyName}", request.Name);
        var company = await _companyService.CreateAsync(request);

        return CreatedAtAction(nameof(GetById), new { companyId = company.CompanyId }, company);
    }

    [HttpPut("me")]
    [Authorize(Roles = "Recruiter")]
    public async Task<IActionResult> UpdateMine(UpdateCompanyRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        _logger.LogInformation("HTTP PUT /api/companies/me by user {UserId}", userId.Value);
        var company = await _companyService.UpdateForUserAsync(userId.Value, request);
        return Ok(company);
    }

    [HttpPost("me/logo")]
    [Authorize(Roles = "Recruiter")]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<IActionResult> UploadLogo(IFormFile file)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        _logger.LogInformation("HTTP POST /api/companies/me/logo by user {UserId}", userId.Value);
        var logoUrl = await _companyService.UploadLogoAsync(userId.Value, file);
        return Ok(new UploadLogoResponse(logoUrl));
    }

    [HttpPost("me/cover")]
    [Authorize(Roles = "Recruiter")]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<IActionResult> UploadCover(IFormFile file)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        _logger.LogInformation("HTTP POST /api/companies/me/cover by user {UserId}", userId.Value);
        var coverUrl = await _companyService.UploadCoverAsync(userId.Value, file);
        return Ok(new UploadLogoResponse(coverUrl));
    }

    private int? GetCurrentUserId()
        => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;
}
