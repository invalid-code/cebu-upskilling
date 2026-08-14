using CebuUpskilling.Backend.Entities;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Seeds the reference data (Disciplines, Skills, RoleSkills) that tests rely
/// on. This data was removed from production migrations by the
/// RemoveSeedData migration, so tests seed it themselves.
/// </summary>
public static class TestDataSeeder
{
    public static void Seed(Data.ApplicationDbContext context)
    {
        SeedDisciplines(context);
        SeedSkills(context);
        SeedRoleSkills(context);
    }

    private static void SeedDisciplines(Data.ApplicationDbContext context)
    {
        if (context.Disciplines.Any()) return;

        context.Disciplines.AddRange(
            new Discipline { DomainId = 1, Name = "Technology", Description = "Computer Science, Information Systems, Engineering" },
            new Discipline { DomainId = 2, Name = "Science", Description = "Natural and applied sciences" },
            new Discipline { DomainId = 3, Name = "Arts", Description = "Liberal arts and humanities" },
            new Discipline { DomainId = 4, Name = "Business", Description = "Business and management" });
        context.SaveChanges();
    }

    private static void SeedSkills(Data.ApplicationDbContext context)
    {
        if (context.Skills.Any()) return;

        context.Skills.AddRange(
            new Skill { SkillId = 1, Name = "JavaScript", Category = "Language" },
            new Skill { SkillId = 2, Name = "TypeScript", Category = "Language" },
            new Skill { SkillId = 3, Name = "React", Category = "Framework" },
            new Skill { SkillId = 4, Name = "CSS", Category = "Language" },
            new Skill { SkillId = 5, Name = "HTML", Category = "Language" },
            new Skill { SkillId = 6, Name = "Node.js", Category = "Runtime" },
            new Skill { SkillId = 7, Name = "Python", Category = "Language" },
            new Skill { SkillId = 8, Name = "SQL", Category = "Language" },
            new Skill { SkillId = 9, Name = "Git", Category = "Tool" },
            new Skill { SkillId = 10, Name = "REST APIs", Category = "Concept" },
            new Skill { SkillId = 11, Name = "Vue.js", Category = "Framework" },
            new Skill { SkillId = 12, Name = "Angular", Category = "Framework" },
            new Skill { SkillId = 13, Name = "Docker", Category = "Tool" },
            new Skill { SkillId = 14, Name = "AWS", Category = "Platform" },
            new Skill { SkillId = 15, Name = "Figma", Category = "Tool" });
        context.SaveChanges();
    }

    private static void SeedRoleSkills(Data.ApplicationDbContext context)
    {
        if (context.RoleSkills.Any()) return;

        context.RoleSkills.AddRange(
            new RoleSkill { SkillId = 1, TargetRole = "Frontend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = 2, TargetRole = "Frontend Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = 3, TargetRole = "Frontend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = 4, TargetRole = "Frontend Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = 5, TargetRole = "Frontend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = 9, TargetRole = "Frontend Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = 10, TargetRole = "Frontend Developer", RequiredLevel = 3 },

            new RoleSkill { SkillId = 1, TargetRole = "Backend Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = 6, TargetRole = "Backend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = 7, TargetRole = "Backend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = 8, TargetRole = "Backend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = 9, TargetRole = "Backend Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = 10, TargetRole = "Backend Developer", RequiredLevel = 4 },

            new RoleSkill { SkillId = 1, TargetRole = "Full Stack Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = 2, TargetRole = "Full Stack Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = 3, TargetRole = "Full Stack Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = 6, TargetRole = "Full Stack Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = 8, TargetRole = "Full Stack Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = 9, TargetRole = "Full Stack Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = 10, TargetRole = "Full Stack Developer", RequiredLevel = 4 },

            new RoleSkill { SkillId = 7, TargetRole = "Data Analyst", RequiredLevel = 4 },
            new RoleSkill { SkillId = 8, TargetRole = "Data Analyst", RequiredLevel = 5 },
            new RoleSkill { SkillId = 1, TargetRole = "Data Analyst", RequiredLevel = 2 },

            new RoleSkill { SkillId = 7, TargetRole = "Data Scientist", RequiredLevel = 5 },
            new RoleSkill { SkillId = 8, TargetRole = "Data Scientist", RequiredLevel = 4 },
            new RoleSkill { SkillId = 1, TargetRole = "Data Scientist", RequiredLevel = 3 },

            new RoleSkill { SkillId = 15, TargetRole = "UI/UX Designer", RequiredLevel = 5 },
            new RoleSkill { SkillId = 4, TargetRole = "UI/UX Designer", RequiredLevel = 4 },
            new RoleSkill { SkillId = 5, TargetRole = "UI/UX Designer", RequiredLevel = 4 },

            new RoleSkill { SkillId = 13, TargetRole = "DevOps Engineer", RequiredLevel = 5 },
            new RoleSkill { SkillId = 14, TargetRole = "DevOps Engineer", RequiredLevel = 4 },
            new RoleSkill { SkillId = 9, TargetRole = "DevOps Engineer", RequiredLevel = 4 },

            new RoleSkill { SkillId = 1, TargetRole = "Quality Assurance", RequiredLevel = 3 },
            new RoleSkill { SkillId = 9, TargetRole = "Quality Assurance", RequiredLevel = 3 },
            new RoleSkill { SkillId = 8, TargetRole = "Quality Assurance", RequiredLevel = 2 });
        context.SaveChanges();
    }
}
