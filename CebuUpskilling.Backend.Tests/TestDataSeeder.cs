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
            new Discipline { DomainId = Guid.NewGuid(), Name = "Technology", Description = "Computer Science, Information Systems, Engineering" },
            new Discipline { DomainId = Guid.NewGuid(), Name = "Science", Description = "Natural and applied sciences" },
            new Discipline { DomainId = Guid.NewGuid(), Name = "Arts", Description = "Liberal arts and humanities" },
            new Discipline { DomainId = Guid.NewGuid(), Name = "Business", Description = "Business and management" });
        context.SaveChanges();
    }

    private static void SeedSkills(Data.ApplicationDbContext context)
    {
        if (context.Skills.Any()) return;

        context.Skills.AddRange(
            new Skill { SkillId = SkillGuids.JavaScript, Name = "JavaScript", Category = "Language" },
            new Skill { SkillId = SkillGuids.TypeScript, Name = "TypeScript", Category = "Language" },
            new Skill { SkillId = SkillGuids.React, Name = "React", Category = "Framework" },
            new Skill { SkillId = SkillGuids.Css, Name = "CSS", Category = "Language" },
            new Skill { SkillId = SkillGuids.Html, Name = "HTML", Category = "Language" },
            new Skill { SkillId = SkillGuids.NodeJs, Name = "Node.js", Category = "Runtime" },
            new Skill { SkillId = SkillGuids.Python, Name = "Python", Category = "Language" },
            new Skill { SkillId = SkillGuids.Sql, Name = "SQL", Category = "Language" },
            new Skill { SkillId = SkillGuids.Git, Name = "Git", Category = "Tool" },
            new Skill { SkillId = SkillGuids.RestApis, Name = "REST APIs", Category = "Concept" },
            new Skill { SkillId = SkillGuids.VueJs, Name = "Vue.js", Category = "Framework" },
            new Skill { SkillId = SkillGuids.Angular, Name = "Angular", Category = "Framework" },
            new Skill { SkillId = SkillGuids.Docker, Name = "Docker", Category = "Tool" },
            new Skill { SkillId = SkillGuids.Aws, Name = "AWS", Category = "Platform" },
            new Skill { SkillId = SkillGuids.Figma, Name = "Figma", Category = "Tool" });
        context.SaveChanges();
    }

    private static void SeedRoleSkills(Data.ApplicationDbContext context)
    {
        if (context.RoleSkills.Any()) return;

        context.RoleSkills.AddRange(
            new RoleSkill { SkillId = SkillGuids.JavaScript, TargetRole = "Frontend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.TypeScript, TargetRole = "Frontend Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = SkillGuids.React, TargetRole = "Frontend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.Css, TargetRole = "Frontend Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = SkillGuids.Html, TargetRole = "Frontend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.Git, TargetRole = "Frontend Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = SkillGuids.RestApis, TargetRole = "Frontend Developer", RequiredLevel = 3 },

            new RoleSkill { SkillId = SkillGuids.JavaScript, TargetRole = "Backend Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = SkillGuids.NodeJs, TargetRole = "Backend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.Python, TargetRole = "Backend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.Sql, TargetRole = "Backend Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.Git, TargetRole = "Backend Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = SkillGuids.RestApis, TargetRole = "Backend Developer", RequiredLevel = 4 },

            new RoleSkill { SkillId = SkillGuids.JavaScript, TargetRole = "Full Stack Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.TypeScript, TargetRole = "Full Stack Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = SkillGuids.React, TargetRole = "Full Stack Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = SkillGuids.NodeJs, TargetRole = "Full Stack Developer", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.Sql, TargetRole = "Full Stack Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = SkillGuids.Git, TargetRole = "Full Stack Developer", RequiredLevel = 3 },
            new RoleSkill { SkillId = SkillGuids.RestApis, TargetRole = "Full Stack Developer", RequiredLevel = 4 },

            new RoleSkill { SkillId = SkillGuids.Python, TargetRole = "Data Analyst", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.Sql, TargetRole = "Data Analyst", RequiredLevel = 5 },
            new RoleSkill { SkillId = SkillGuids.JavaScript, TargetRole = "Data Analyst", RequiredLevel = 2 },

            new RoleSkill { SkillId = SkillGuids.Python, TargetRole = "Data Scientist", RequiredLevel = 5 },
            new RoleSkill { SkillId = SkillGuids.Sql, TargetRole = "Data Scientist", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.JavaScript, TargetRole = "Data Scientist", RequiredLevel = 3 },

            new RoleSkill { SkillId = SkillGuids.Figma, TargetRole = "UI/UX Designer", RequiredLevel = 5 },
            new RoleSkill { SkillId = SkillGuids.Css, TargetRole = "UI/UX Designer", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.Html, TargetRole = "UI/UX Designer", RequiredLevel = 4 },

            new RoleSkill { SkillId = SkillGuids.Docker, TargetRole = "DevOps Engineer", RequiredLevel = 5 },
            new RoleSkill { SkillId = SkillGuids.Aws, TargetRole = "DevOps Engineer", RequiredLevel = 4 },
            new RoleSkill { SkillId = SkillGuids.Git, TargetRole = "DevOps Engineer", RequiredLevel = 4 },

            new RoleSkill { SkillId = SkillGuids.JavaScript, TargetRole = "Quality Assurance", RequiredLevel = 3 },
            new RoleSkill { SkillId = SkillGuids.Git, TargetRole = "Quality Assurance", RequiredLevel = 3 },
            new RoleSkill { SkillId = SkillGuids.Sql, TargetRole = "Quality Assurance", RequiredLevel = 2 });
        context.SaveChanges();
    }

    private static class SkillGuids
    {
        public static readonly Guid JavaScript = Guid.NewGuid();
        public static readonly Guid TypeScript = Guid.NewGuid();
        public static readonly Guid React = Guid.NewGuid();
        public static readonly Guid Css = Guid.NewGuid();
        public static readonly Guid Html = Guid.NewGuid();
        public static readonly Guid NodeJs = Guid.NewGuid();
        public static readonly Guid Python = Guid.NewGuid();
        public static readonly Guid Sql = Guid.NewGuid();
        public static readonly Guid Git = Guid.NewGuid();
        public static readonly Guid RestApis = Guid.NewGuid();
        public static readonly Guid VueJs = Guid.NewGuid();
        public static readonly Guid Angular = Guid.NewGuid();
        public static readonly Guid Docker = Guid.NewGuid();
        public static readonly Guid Aws = Guid.NewGuid();
        public static readonly Guid Figma = Guid.NewGuid();
    }
}
