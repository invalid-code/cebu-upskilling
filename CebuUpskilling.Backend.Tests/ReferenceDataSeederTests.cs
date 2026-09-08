using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Tests;

public class ReferenceDataSeederTests
{
    [Fact]
    public async Task SeedAsync_EmptyDatabase_SeedsTaxonomySkillsAndRoleSkills()
    {
        var context = TestDbContextFactory.Create();

        await ReferenceDataSeeder.SeedAsync(context);

        Assert.Equal(4, await context.Disciplines.CountAsync());
        Assert.Equal(5, await context.SubDisciplines.CountAsync());
        Assert.Equal(11, await context.Genres.CountAsync());
        Assert.Equal(15, await context.Skills.CountAsync());
        Assert.Equal(35, await context.RoleSkills.CountAsync());

        var web = await context.Genres
            .Include(g => g.SubDiscipline)
            .SingleAsync(g => g.Name == "Web Development");
        Assert.Equal("Software Development", web.SubDiscipline.Name);

        var js = await context.Skills.SingleAsync(s => s.Name == "JavaScript");
        var frontendJs = await context.RoleSkills
            .SingleAsync(rs => rs.TargetRole == "Frontend Developer" && rs.SkillId == js.SkillId);
        Assert.Equal(4, frontendJs.RequiredLevel);
    }

    [Fact]
    public async Task SeedAsync_RunTwice_DoesNotDuplicate()
    {
        var context = TestDbContextFactory.Create();

        await ReferenceDataSeeder.SeedAsync(context);
        await ReferenceDataSeeder.SeedAsync(context);

        Assert.Equal(4, await context.Disciplines.CountAsync());
        Assert.Equal(5, await context.SubDisciplines.CountAsync());
        Assert.Equal(11, await context.Genres.CountAsync());
        Assert.Equal(15, await context.Skills.CountAsync());
        Assert.Equal(35, await context.RoleSkills.CountAsync());
    }

    [Fact]
    public async Task SeedAsync_NonEmptyTables_AreLeftAlone()
    {
        var context = TestDbContextFactory.Create();
        context.Disciplines.Add(new Discipline { Name = "Custom", Description = "Hand-curated" });
        context.Skills.Add(new Skill { Name = "Custom Skill", Category = "Custom" });
        await context.SaveChangesAsync();

        await ReferenceDataSeeder.SeedAsync(context);

        Assert.Single(await context.Disciplines.ToListAsync());
        Assert.Single(await context.Skills.ToListAsync());
        Assert.Empty(await context.RoleSkills.ToListAsync());
    }

    [Fact]
    public async Task SeedAsync_PartialTaxonomy_SkipsOrphansWithoutThrowing()
    {
        var context = TestDbContextFactory.Create();
        // Disciplines exist but none of the expected parents: subs/genres that
        // would dangle are skipped instead of failing the whole seed.
        context.Disciplines.Add(new Discipline { Name = "Unrelated", Description = "No children" });
        await context.SaveChangesAsync();

        await ReferenceDataSeeder.SeedAsync(context);

        Assert.Empty(await context.SubDisciplines.ToListAsync());
        Assert.Empty(await context.Genres.ToListAsync());
    }

    [Fact]
    public async Task SeedAsync_GeneratedIds_AcceptNewRows()
    {
        var context = TestDbContextFactory.Create();

        await ReferenceDataSeeder.SeedAsync(context);
        context.Skills.Add(new Skill { Name = "Brand New Skill", Category = "Language" });
        await context.SaveChangesAsync();

        Assert.Equal(16, await context.Skills.CountAsync());
    }
}
