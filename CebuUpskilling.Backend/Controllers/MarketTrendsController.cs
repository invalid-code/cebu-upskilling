using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/market-trends")]
[Authorize]
public class MarketTrendsController : ControllerBase
{
    private readonly IJobMarketTrendService _trends;
    private readonly ILogger<MarketTrendsController> _logger;

    public MarketTrendsController(IJobMarketTrendService trends, ILogger<MarketTrendsController> logger)
    {
        _trends = trends;
        _logger = logger;
    }

    /// <summary>
    /// Current job-market demand per skill and per target role, most-demanded first.
    /// Updated automatically whenever job posts are created, updated or deleted.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<MarketTrendsResponse>> Get([FromQuery] int top = 50)
    {
        _logger.LogInformation("HTTP GET /api/market-trends called");
        var trends = await _trends.GetTrendsAsync(top);
        return Ok(trends);
    }
}
