using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Data;

/// <summary>
/// Seeds the reference data the platform cannot function without:
/// course taxonomy (Disciplines → SubDisciplines → Genres), the skill
/// catalog, and per-target-role required skill levels. Every table is only
/// touched when completely empty, so existing data (including hand-curated
/// taxonomies) is never modified. IDs are always database-generated — never
/// insert explicit IDs here, or the Postgres identity sequences desync and
/// all later inserts fail with duplicate-key violations.
/// </summary>
public static class ReferenceDataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        if (!await context.Disciplines.AnyAsync(ct))
        {
            context.Disciplines.AddRange(
                NewDiscipline("Technology", "Computer Science, Information Systems, Engineering", now),
                NewDiscipline("Science", "Natural and applied sciences", now),
                NewDiscipline("Arts", "Liberal arts and humanities", now),
                NewDiscipline("Business", "Business and management", now));
            await context.SaveChangesAsync(ct);
        }

        if (!await context.SubDisciplines.AnyAsync(ct))
        {
            var disciplines = await context.Disciplines.ToDictionaryAsync(d => d.Name, d => d.DomainId, ct);
            var subs = new[]
            {
                NewSubDiscipline(disciplines, "Technology", "Software Development", "Designing and building software applications", now),
                NewSubDiscipline(disciplines, "Technology", "Data & AI", "Data analysis, machine learning and artificial intelligence", now),
                NewSubDiscipline(disciplines, "Technology", "IT Operations", "Infrastructure, cloud and reliable operations", now),
                NewSubDiscipline(disciplines, "Business", "Business Management", "Running and growing a business", now),
                NewSubDiscipline(disciplines, "Arts", "Creative Design", "Visual and experience design", now),
            }.Where(s => s is not null).Select(s => s!);
            context.SubDisciplines.AddRange(subs);
            await context.SaveChangesAsync(ct);
        }

        if (!await context.Genres.AnyAsync(ct))
        {
            var subs = await context.SubDisciplines.ToDictionaryAsync(s => s.Name, s => s.SubDisciplineId, ct);
            var genres = new[]
            {
                NewGenre(subs, "Software Development", "Web Development", "Building websites and web applications", now),
                NewGenre(subs, "Software Development", "Mobile Development", "Building iOS and Android applications", now),
                NewGenre(subs, "Software Development", "Backend Development", "APIs, databases and server-side systems", now),
                NewGenre(subs, "Data & AI", "Data Science", "Statistics, analysis and data storytelling", now),
                NewGenre(subs, "Data & AI", "Machine Learning", "Models that learn from data", now),
                NewGenre(subs, "IT Operations", "DevOps & Cloud", "CI/CD, containers and cloud platforms", now),
                NewGenre(subs, "Business Management", "Entrepreneurship", "Starting and scaling ventures", now),
                NewGenre(subs, "Business Management", "Project Management", "Delivering work on time and on budget", now),
                NewGenre(subs, "Business Management", "Marketing", "Reaching and converting customers", now),
                NewGenre(subs, "Creative Design", "UI/UX Design", "Interfaces people enjoy using", now),
                NewGenre(subs, "Creative Design", "Graphic Design", "Visual communication and branding", now),
            }.Where(g => g is not null).Select(g => g!);
            context.Genres.AddRange(genres);
            await context.SaveChangesAsync(ct);
        }

        if (!await context.Skills.AnyAsync(ct))
        {
            context.Skills.AddRange(SkillCatalog.Select(s => new Skill
            {
                Name = s.Name,
                Category = s.Category,
            }));
            await context.SaveChangesAsync(ct);
        }

        if (!await context.RoleSkills.AnyAsync(ct))
        {
            var skillIds = await context.Skills.ToDictionaryAsync(s => s.Name, s => s.SkillId, ct);
            foreach (var (targetRole, skillName, level) in RoleSkillMatrix)
            {
                if (!skillIds.TryGetValue(skillName, out var skillId)) continue;
                context.RoleSkills.Add(new RoleSkill
                {
                    TargetRole = targetRole,
                    SkillId = skillId,
                    RequiredLevel = level,
                });
            }
            await context.SaveChangesAsync(ct);
        }
    }

    private static Discipline NewDiscipline(string name, string description, DateTime now) => new()
    {
        Name = name,
        Description = description,
        CreatedAt = now,
    };

    private static SubDiscipline? NewSubDiscipline(
        Dictionary<string, int> disciplines, string discipline, string name, string description, DateTime now)
        => disciplines.TryGetValue(discipline, out var disciplineId) ? new SubDiscipline
        {
            DisciplineId = disciplineId,
            Name = name,
            Description = description,
            CreatedAt = now,
        } : null;

    private static Genre? NewGenre(
        Dictionary<string, int> subs, string sub, string name, string description, DateTime now)
        => subs.TryGetValue(sub, out var subDisciplineId) ? new Genre
        {
            SubDisciplineId = subDisciplineId,
            Name = name,
            Description = description,
            CreatedAt = now,
        } : null;

    private static readonly (string Name, string Category)[] SkillCatalog =
    [
        ("JavaScript", "Language"),
        ("TypeScript", "Language"),
        ("React", "Framework"),
        ("CSS", "Language"),
        ("HTML", "Language"),
        ("Node.js", "Runtime"),
        ("Python", "Language"),
        ("SQL", "Language"),
        ("Git", "Tool"),
        ("REST APIs", "Concept"),
        ("Vue.js", "Framework"),
        ("Angular", "Framework"),
        ("Docker", "Tool"),
        ("AWS", "Platform"),
        ("Figma", "Tool"),
    ];

    private static readonly (string TargetRole, string Skill, int Level)[] RoleSkillMatrix =
    [
        ("Frontend Developer", "JavaScript", 4),
        ("Frontend Developer", "TypeScript", 3),
        ("Frontend Developer", "React", 4),
        ("Frontend Developer", "CSS", 3),
        ("Frontend Developer", "HTML", 4),
        ("Frontend Developer", "Git", 3),
        ("Frontend Developer", "REST APIs", 3),
        ("Backend Developer", "JavaScript", 3),
        ("Backend Developer", "Node.js", 4),
        ("Backend Developer", "Python", 4),
        ("Backend Developer", "SQL", 4),
        ("Backend Developer", "Git", 3),
        ("Backend Developer", "REST APIs", 4),
        ("Full Stack Developer", "JavaScript", 4),
        ("Full Stack Developer", "TypeScript", 3),
        ("Full Stack Developer", "React", 3),
        ("Full Stack Developer", "Node.js", 4),
        ("Full Stack Developer", "SQL", 3),
        ("Full Stack Developer", "Git", 3),
        ("Full Stack Developer", "REST APIs", 4),
        ("Data Analyst", "Python", 4),
        ("Data Analyst", "SQL", 5),
        ("Data Analyst", "JavaScript", 2),
        ("Data Scientist", "Python", 5),
        ("Data Scientist", "SQL", 4),
        ("Data Scientist", "JavaScript", 3),
        ("UI/UX Designer", "Figma", 5),
        ("UI/UX Designer", "CSS", 4),
        ("UI/UX Designer", "HTML", 4),
        ("DevOps Engineer", "Docker", 5),
        ("DevOps Engineer", "AWS", 4),
        ("DevOps Engineer", "Git", 4),
        ("Quality Assurance", "JavaScript", 3),
        ("Quality Assurance", "Git", 3),
        ("Quality Assurance", "SQL", 2),
    ];
}
