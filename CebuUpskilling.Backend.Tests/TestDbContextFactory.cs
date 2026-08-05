using CebuUpskilling.Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Tests;

public static class TestDbContextFactory
{
    public static ApplicationDbContext Create()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"cebu-upskilling-test-{Guid.NewGuid()}")
            .Options;

        var context = new ApplicationDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }
}
