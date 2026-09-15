using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Options;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class SkillsSeedServiceTests
{
    private sealed class StubSkillsSource(IReadOnlyList<string> names) : ISkillsSource
    {
        public Task<IReadOnlyList<string>> GetSkillNamesAsync(CancellationToken cancellationToken = default)
            => Task.FromResult(names);
    }

    private static SkillsSeedService CreateService(ApplicationDbContext context, IReadOnlyList<string> names)
    {
        var services = new ServiceCollection();
        services.AddSingleton(context);
        services.AddSingleton<ISkillsSource>(new StubSkillsSource(names));
        var provider = services.BuildServiceProvider();

        return new SkillsSeedService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            Microsoft.Extensions.Options.Options.Create(new SkillsSeedOptions()),
            NullLogger<SkillsSeedService>.Instance);
    }

    [Fact]
    public async Task SeedAsync_InsertsMissingSkills_AndIsIdempotent()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context, ["Welding", "Scaffolding"]);

        var first = await service.SeedAsync();
        var second = await service.SeedAsync();

        Assert.Equal(2, first.Inserted);
        Assert.Equal(0, second.Inserted);
        Assert.Equal(2, await context.Skills.CountAsync());
    }

    [Fact]
    public async Task SeedAsync_SkipsExistingSkillsCaseInsensitively()
    {
        var context = TestDbContextFactory.Create();
        context.Skills.Add(new Skill { Name = "welding" });
        await context.SaveChangesAsync();

        var service = CreateService(context, ["Welding", "  WELDING  ", "Scaffolding"]);

        var result = await service.SeedAsync();

        Assert.Equal(3, result.Fetched);
        Assert.Equal(1, result.Inserted);
        Assert.Equal(1, result.Skipped);
        Assert.Equal(2, await context.Skills.CountAsync());
    }

    [Fact]
    public async Task SeedAsync_NormalizesWhitespaceDuplicatesAndOversizedNames()
    {
        var context = TestDbContextFactory.Create();
        var tooLong = new string('x', SkillsSeedService.MaxNameLength + 1);
        var service = CreateService(context,
        [
            "  Data   Analytics  ",
            "data analytics",
            "",
            "   ",
            tooLong,
        ]);

        var result = await service.SeedAsync();

        Assert.Equal(5, result.Fetched);
        Assert.Equal(1, result.Inserted);
        var names = await context.Skills.Select(s => s.Name).ToListAsync();
        Assert.Equal(["Data Analytics"], names);
    }

    [Fact]
    public void StaticCatalog_ContainsUsableUniqueNames()
    {
        var names = StaticSkillsCatalog.Names;

        Assert.NotEmpty(names);
        Assert.All(names, n => Assert.False(string.IsNullOrWhiteSpace(n)));
        Assert.All(names, n => Assert.True(n.Length <= SkillsSeedService.MaxNameLength, $"Too long: {n}"));
        Assert.Equal(names.Length, names.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }

    [Fact]
    public async Task SeedAsync_WithStaticCatalog_SeedsExpectedCount()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context, StaticSkillsCatalog.Names);

        var result = await service.SeedAsync();

        Assert.Equal(StaticSkillsCatalog.Names.Length, result.Inserted);
        Assert.Equal(0, result.Skipped);
        Assert.Equal(StaticSkillsCatalog.Names.Length, await context.Skills.CountAsync());
    }
}
