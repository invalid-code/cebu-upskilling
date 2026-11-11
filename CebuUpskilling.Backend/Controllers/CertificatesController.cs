using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CertificatesController : ControllerBase
{
    private readonly ICertificateService _certificates;
    private readonly ILogger<CertificatesController> _logger;

    public CertificatesController(ICertificateService certificates, ILogger<CertificatesController> logger)
    {
        _certificates = certificates;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<CertificateDto>>> GetMine(CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP GET /api/certificates called by user {UserId}", userId);

        var certificates = await _certificates.GetForUserAsync(userId, cancellationToken);
        return Ok(certificates);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CertificateDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized(new { error = "Unauthorized" });
        _logger.LogInformation("HTTP GET /api/certificates/{CertificateId} called by user {UserId}", id, userId);

        var certificate = await _certificates.GetForUserAsync(userId, id, cancellationToken);
        return certificate is null
            ? NotFound(new { error = "Certificate not found" })
            : Ok(certificate);
    }

    /// <summary>
    /// Public verification handle printed on the certificate. Returns only the
    /// snapshot fields needed to confirm that a credential is genuine.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("verify/{serialNumber}")]
    public async Task<ActionResult<CertificateDto>> Verify(string serialNumber, CancellationToken cancellationToken)
    {
        var certificate = await _certificates.VerifyAsync(serialNumber, cancellationToken);
        return certificate is null
            ? NotFound(new { error = "Certificate not found" })
            : Ok(certificate);
    }
}
