using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class EntityServiceTests
{
    private static CourseService CreateCourseService(ApplicationDbContext context)
        => new(new CourseRepository(context), NullLogger<CourseService>.Instance);

    private static async Task<Genre> CreateGenreAsync(ApplicationDbContext context)
    {
        var discipline = new Discipline { Name = "Technology" };
        context.Disciplines.Add(discipline);
        await context.SaveChangesAsync();

        var sub = new SubDiscipline { DisciplineId = discipline.DomainId, Name = "Web Development" };
        context.SubDisciplines.Add(sub);
        await context.SaveChangesAsync();

        var genre = new Genre { SubDisciplineId = sub.SubDisciplineId, Name = "Frontend" };
        context.Genres.Add(genre);
        await context.SaveChangesAsync();
        return genre;
    }

    private static async Task<Course> SeedCourseAsync(ApplicationDbContext context, string name)
    {
        var genre = await CreateGenreAsync(context);
        var course = new Course { GenreId = genre.GenreId, Name = name };
        context.Courses.Add(course);
        await context.SaveChangesAsync();
        return course;
    }

    [Fact]
    public async Task CreateAsync_PersistsAndReturnsEntity()
    {
        var context = TestDbContextFactory.Create();
        var genre = await CreateGenreAsync(context);
        var course = new Course { GenreId = genre.GenreId, Name = "Intro to Frontend", Price = 99, Mode = "Online", TechnicalLevel = 1 };

        var created = await CreateCourseService(context).CreateAsync(course);

        Assert.Equal(course.CourseId, created.CourseId);
        var saved = await context.Courses.SingleAsync(c => c.CourseId == created.CourseId);
        Assert.Equal("Intro to Frontend", saved.Name);
        Assert.Equal(99, saved.Price);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsAllEntities()
    {
        var context = TestDbContextFactory.Create();
        await SeedCourseAsync(context, "Course A");
        await SeedCourseAsync(context, "Course B");

        var result = await CreateCourseService(context).GetAllAsync();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotFound_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();

        var result = await CreateCourseService(context).GetByIdAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_WhenFound_AppliesChanges()
    {
        var context = TestDbContextFactory.Create();
        var course = await SeedCourseAsync(context, "Old Name");

        var updated = await CreateCourseService(context).UpdateAsync(
            course.CourseId,
            new Course { Name = "New Name", Price = 20, Mode = "Offline", TechnicalLevel = 2 });

        Assert.NotNull(updated);
        Assert.Equal("New Name", updated!.Name);
        Assert.Equal(20, updated.Price);
        Assert.Equal("Offline", updated.Mode);
        Assert.Equal(2, updated.TechnicalLevel);

        var saved = await context.Courses.SingleAsync(c => c.CourseId == course.CourseId);
        Assert.Equal("New Name", saved.Name);
    }

    [Fact]
    public async Task UpdateAsync_WhenNotFound_ReturnsNull()
    {
        var context = TestDbContextFactory.Create();

        var result = await CreateCourseService(context).UpdateAsync(
            999,
            new Course { Name = "Anything" });

        Assert.Null(result);
        Assert.Empty(await context.Courses.ToListAsync());
    }

    [Fact]
    public async Task DeleteAsync_WhenFound_RemovesEntity()
    {
        var context = TestDbContextFactory.Create();
        var course = await SeedCourseAsync(context, "To Delete");

        var deleted = await CreateCourseService(context).DeleteAsync(course.CourseId);

        Assert.True(deleted);
        Assert.Empty(await context.Courses.ToListAsync());
    }

    [Fact]
    public async Task DeleteAsync_WhenNotFound_ReturnsFalse()
    {
        var context = TestDbContextFactory.Create();

        var deleted = await CreateCourseService(context).DeleteAsync(999);

        Assert.False(deleted);
    }
}
