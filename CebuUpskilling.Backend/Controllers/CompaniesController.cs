using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/companies")]
[Authorize]
public class CompaniesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CompaniesController> _logger;

    public CompaniesController(ApplicationDbContext context, ILogger<CompaniesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        _logger.LogInformation("HTTP GET /api/companies requested");
        var companies = await _context.Companies.ToListAsync();
        _logger.LogInformation("Returning {Count} companies", companies.Count);
        return Ok(companies);
    }

    [HttpPost]
    [Authorize(Roles = "Recruiter")]
    public async Task<IActionResult> Create(Company company)
    {
        _logger.LogInformation("HTTP POST /api/companies to create company {CompanyName}", company.Name);
        _context.Companies.Add(company);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Company created: {CompanyId} ({CompanyName})", company.CompanyId, company.Name);

        return Created($"/api/companies/{company.CompanyId}", company);
    }
}
