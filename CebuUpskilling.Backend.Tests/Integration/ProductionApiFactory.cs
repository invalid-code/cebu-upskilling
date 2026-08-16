using CebuUpskilling.Backend.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace CebuUpskilling.Backend.Tests.Integration;

/// <summary>
/// Boots the real application (Program.cs) with its production configuration
/// and points it at a dedicated PostgreSQL test database.
/// </summary>
public class ProductionApiFactory : WebApplicationFactory<Program>
{
    public const string TestDatabaseName = "cebu_upskilling_test";

    public string TestConnectionString { get; private set; } = string.Empty;

    private const string ResetSql = """
        TRUNCATE TABLE
            "LearnerStudyCourses",
            "LearnerSkills",
            "LearnerAssessments",
            "PostCourseRequireds",
            "Applications",
            "Posts",
            "Recruiters",
            "Learners",
            "Users",
            "Companies",
            "Courses",
            "Lessons",
            "LessonContents",
            "Media",
            "Exercises",
            "ExerciseContents",
            "Genres",
            "SubDisciplines"
        RESTART IDENTITY CASCADE;
        """;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            var original = config.Build().GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(original))
            {
                original = "Host=localhost;Port=5432;Database=cebu_upskilling;Username=postgres";
            }

            TestConnectionString = new NpgsqlConnectionStringBuilder(original)
            {
                Database = TestDatabaseName,
            }.ConnectionString;

            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = TestConnectionString,
            });
        });

        builder.ConfigureLogging(logging =>
        {
            logging.ClearProviders();
            logging.AddConsole();
        });
    }

    public async Task EnsureMigratedAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        try
        {
            await db.Database.MigrateAsync();
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidCatalogName)
        {
            await EnsureDatabaseExistsAsync();
            await db.Database.MigrateAsync();
        }
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.ExecuteSqlRawAsync(ResetSql);
    }

    public ApplicationDbContext CreateDbContext()
    {
        var scope = Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    }

    private async Task EnsureDatabaseExistsAsync()
    {
        var builder = new NpgsqlConnectionStringBuilder(TestConnectionString);
        var databaseName = builder.Database;
        builder.Database = "postgres";

        await using var connection = new NpgsqlConnection(builder.ConnectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = $"SELECT 1 FROM pg_database WHERE datname = '{databaseName}'";
        var exists = await command.ExecuteScalarAsync();

        if (exists is null)
        {
            command.CommandText = $"CREATE DATABASE \"{databaseName}\"";
            await command.ExecuteNonQueryAsync();
        }
    }
}
