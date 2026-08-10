using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class EntityServiceTests
{
    private static DisciplineService CreateService(Data.ApplicationDbContext context) => new(
        new DisciplineRepository(context),
        NullLogger<DisciplineService>.Instance
    );

    [Fact]
    public async Task GetAllAsync_ReturnsSeededDisciplines()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.GetAllAsync();

        Assert.Equal(4, result.Count);
        Assert.Contains(result, d => d.Name == "Technology");
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsMatchingEntity()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal("Science", result.Name);
    }

    [Fact]
    public async Task GetByIdAsync_NonExistent_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.GetByIdAsync(9999);

        Assert.Null(result);
    }

    [Fact]
    public async Task CreateAsync_AddsAndReturnsEntity()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var created = await service.CreateAsync(new Discipline { Name = "Law", Description = "Legal studies" });

        Assert.True(created.DomainId > 0);
        Assert.Equal("Law", created.Name);
        Assert.Equal(5, await context.Disciplines.CountAsync());
    }

    [Fact]
    public async Task UpdateAsync_ModifiesExistingEntity()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var updated = await service.UpdateAsync(1, new Discipline { Name = "Natural Science", Description = "Updated" });

        Assert.NotNull(updated);
        Assert.Equal("Natural Science", updated.Name);
        Assert.Equal("Updated", updated.Description);

        var reloaded = await context.Disciplines.FindAsync(1);
        Assert.NotNull(reloaded);
        Assert.Equal("Natural Science", reloaded.Name);
    }

    [Fact]
    public async Task UpdateAsync_NonExistent_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.UpdateAsync(9999, new Discipline { Name = "X" });

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_RemovesEntity_ReturnsTrue()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.DeleteAsync(1);

        Assert.True(result);
        Assert.Null(await context.Disciplines.FindAsync(1));
        Assert.Equal(3, await context.Disciplines.CountAsync());
    }

    [Fact]
    public async Task DeleteAsync_NonExistent_ReturnsFalse()
    {
        var context = TestDbContextFactory.Create();
        var service = CreateService(context);

        var result = await service.DeleteAsync(9999);

        Assert.False(result);
    }
}
