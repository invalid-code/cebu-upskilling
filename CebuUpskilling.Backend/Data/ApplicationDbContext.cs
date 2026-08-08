using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Discipline> Disciplines => Set<Discipline>();
    public DbSet<SubDiscipline> SubDisciplines => Set<SubDiscipline>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<LessonContent> LessonContents => Set<LessonContent>();
    public DbSet<Media> Media => Set<Media>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<ExerciseContent> ExerciseContents => Set<ExerciseContent>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Learner> Learners => Set<Learner>();
    public DbSet<LearnerStudyCourse> LearnerStudyCourses => Set<LearnerStudyCourse>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Recruiter> Recruiters => Set<Recruiter>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<PostCourseRequired> PostCourseRequireds => Set<PostCourseRequired>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<RoleSkill> RoleSkills => Set<RoleSkill>();
    public DbSet<LearnerSkill> LearnerSkills => Set<LearnerSkill>();
    public DbSet<LearnerAssessment> LearnerAssessments => Set<LearnerAssessment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<SubDiscipline>()
            .HasOne(s => s.Discipline)
            .WithMany(d => d.SubDisciplines)
            .HasForeignKey(s => s.DisciplineId);

        modelBuilder.Entity<Genre>()
            .HasOne(g => g.SubDiscipline)
            .WithMany(sd => sd.Genres)
            .HasForeignKey(g => g.SubDisciplineId);

        modelBuilder.Entity<Course>()
            .HasOne(c => c.Genre)
            .WithMany(g => g.Courses)
            .HasForeignKey(c => c.GenreId);

        modelBuilder.Entity<Lesson>()
            .HasOne(l => l.Course)
            .WithMany(c => c.Lessons)
            .HasForeignKey(l => l.CourseId);

        modelBuilder.Entity<LessonContent>()
            .HasOne(lc => lc.Lesson)
            .WithMany(l => l.LessonContents)
            .HasForeignKey(lc => lc.LessonId);

        modelBuilder.Entity<Media>()
            .HasOne(m => m.Lesson)
            .WithMany(l => l.Media)
            .HasForeignKey(m => m.LessonId);

        modelBuilder.Entity<Exercise>()
            .HasOne(e => e.Lesson)
            .WithMany(l => l.Exercises)
            .HasForeignKey(e => e.LessonId);

        modelBuilder.Entity<Exercise>()
            .HasOne(e => e.ExerciseContent)
            .WithOne(ec => ec.Exercise)
            .HasForeignKey<ExerciseContent>(ec => ec.ExerciseId);

        modelBuilder.Entity<Learner>()
            .HasOne(l => l.User)
            .WithOne(u => u.Learner)
            .HasForeignKey<Learner>(l => l.UserId);

        modelBuilder.Entity<LearnerStudyCourse>()
            .HasKey(lsc => new { lsc.LearnerId, lsc.CourseId });

        modelBuilder.Entity<LearnerStudyCourse>()
            .HasOne(lsc => lsc.Learner)
            .WithMany(l => l.LearnerStudyCourses)
            .HasForeignKey(lsc => lsc.LearnerId);

        modelBuilder.Entity<LearnerStudyCourse>()
            .HasOne(lsc => lsc.Course)
            .WithMany(c => c.LearnerStudyCourses)
            .HasForeignKey(lsc => lsc.CourseId);

        modelBuilder.Entity<Recruiter>()
            .HasOne(r => r.Company)
            .WithMany(c => c.Recruiters)
            .HasForeignKey(r => r.CompanyId);

        modelBuilder.Entity<Recruiter>()
            .HasOne(r => r.User)
            .WithOne(u => u.Recruiter)
            .HasForeignKey<Recruiter>(r => r.UserId);

        modelBuilder.Entity<Post>()
            .HasOne(p => p.Recruiter)
            .WithMany(r => r.Posts)
            .HasForeignKey(p => p.RecruiterId);

        modelBuilder.Entity<Post>()
            .HasOne(p => p.Company)
            .WithMany(c => c.Posts)
            .HasForeignKey(p => p.CompanyId);

        modelBuilder.Entity<PostCourseRequired>()
            .HasKey(pcr => new { pcr.PostId, pcr.CourseId });

        modelBuilder.Entity<PostCourseRequired>()
            .HasOne(pcr => pcr.Post)
            .WithMany(p => p.PostCourseRequireds)
            .HasForeignKey(pcr => pcr.PostId);

        modelBuilder.Entity<PostCourseRequired>()
            .HasOne(pcr => pcr.Course)
            .WithMany(c => c.PostCourseRequireds)
            .HasForeignKey(pcr => pcr.CourseId);

        modelBuilder.Entity<AppUser>()
            .HasIndex(u => u.EmailAddress)
            .IsUnique();

        modelBuilder.Entity<RoleSkill>()
            .HasOne(rs => rs.Skill)
            .WithMany(s => s.RoleSkills)
            .HasForeignKey(rs => rs.SkillId);

        modelBuilder.Entity<LearnerSkill>()
            .HasOne(ls => ls.Learner)
            .WithMany(l => l.LearnerSkills)
            .HasForeignKey(ls => ls.LearnerId);

        modelBuilder.Entity<LearnerSkill>()
            .HasOne(ls => ls.Skill)
            .WithMany(s => s.LearnerSkills)
            .HasForeignKey(ls => ls.SkillId);

        modelBuilder.Entity<LearnerSkill>()
            .HasIndex(ls => new { ls.LearnerId, ls.SkillId })
            .IsUnique();

        modelBuilder.Entity<LearnerAssessment>()
            .HasOne(a => a.Learner)
            .WithMany(l => l.LearnerAssessments)
            .HasForeignKey(a => a.LearnerId);

        modelBuilder.Entity<LearnerAssessment>()
            .HasOne(a => a.Skill)
            .WithMany()
            .HasForeignKey(a => a.SkillId);

        modelBuilder.Entity<Discipline>().HasData(
            new Discipline { DomainId = 1, Name = "Science", Description = "Natural and applied sciences" },
            new Discipline { DomainId = 2, Name = "Arts", Description = "Liberal arts and humanities" },
            new Discipline { DomainId = 3, Name = "Technology", Description = "Computer Science, Information Systems, Engineering" },
            new Discipline { DomainId = 4, Name = "Business", Description = "Business and management" }
        );

        modelBuilder.Entity<Skill>().HasData(
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
            new Skill { SkillId = 15, Name = "Figma", Category = "Tool" }
        );

        modelBuilder.Entity<RoleSkill>().HasData(
            new RoleSkill { RoleSkillId = 1, TargetRole = "Frontend Developer", SkillId = 1, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 2, TargetRole = "Frontend Developer", SkillId = 2, RequiredLevel = 3 },
            new RoleSkill { RoleSkillId = 3, TargetRole = "Frontend Developer", SkillId = 3, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 4, TargetRole = "Frontend Developer", SkillId = 4, RequiredLevel = 3 },
            new RoleSkill { RoleSkillId = 5, TargetRole = "Frontend Developer", SkillId = 5, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 6, TargetRole = "Frontend Developer", SkillId = 9, RequiredLevel = 3 },
            new RoleSkill { RoleSkillId = 7, TargetRole = "Frontend Developer", SkillId = 10, RequiredLevel = 3 },

            new RoleSkill { RoleSkillId = 8, TargetRole = "Backend Developer", SkillId = 1, RequiredLevel = 3 },
            new RoleSkill { RoleSkillId = 9, TargetRole = "Backend Developer", SkillId = 6, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 10, TargetRole = "Backend Developer", SkillId = 7, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 11, TargetRole = "Backend Developer", SkillId = 8, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 12, TargetRole = "Backend Developer", SkillId = 9, RequiredLevel = 3 },
            new RoleSkill { RoleSkillId = 13, TargetRole = "Backend Developer", SkillId = 10, RequiredLevel = 4 },

            new RoleSkill { RoleSkillId = 14, TargetRole = "Full Stack Developer", SkillId = 1, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 15, TargetRole = "Full Stack Developer", SkillId = 2, RequiredLevel = 3 },
            new RoleSkill { RoleSkillId = 16, TargetRole = "Full Stack Developer", SkillId = 3, RequiredLevel = 3 },
            new RoleSkill { RoleSkillId = 17, TargetRole = "Full Stack Developer", SkillId = 6, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 18, TargetRole = "Full Stack Developer", SkillId = 8, RequiredLevel = 3 },
            new RoleSkill { RoleSkillId = 19, TargetRole = "Full Stack Developer", SkillId = 9, RequiredLevel = 3 },
            new RoleSkill { RoleSkillId = 20, TargetRole = "Full Stack Developer", SkillId = 10, RequiredLevel = 4 },

            new RoleSkill { RoleSkillId = 21, TargetRole = "Data Analyst", SkillId = 7, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 22, TargetRole = "Data Analyst", SkillId = 8, RequiredLevel = 5 },
            new RoleSkill { RoleSkillId = 23, TargetRole = "Data Analyst", SkillId = 1, RequiredLevel = 2 },

            new RoleSkill { RoleSkillId = 24, TargetRole = "Data Scientist", SkillId = 7, RequiredLevel = 5 },
            new RoleSkill { RoleSkillId = 25, TargetRole = "Data Scientist", SkillId = 8, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 26, TargetRole = "Data Scientist", SkillId = 1, RequiredLevel = 3 },

            new RoleSkill { RoleSkillId = 27, TargetRole = "UI/UX Designer", SkillId = 15, RequiredLevel = 5 },
            new RoleSkill { RoleSkillId = 28, TargetRole = "UI/UX Designer", SkillId = 4, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 29, TargetRole = "UI/UX Designer", SkillId = 5, RequiredLevel = 4 },

            new RoleSkill { RoleSkillId = 30, TargetRole = "DevOps Engineer", SkillId = 13, RequiredLevel = 5 },
            new RoleSkill { RoleSkillId = 31, TargetRole = "DevOps Engineer", SkillId = 14, RequiredLevel = 4 },
            new RoleSkill { RoleSkillId = 32, TargetRole = "DevOps Engineer", SkillId = 9, RequiredLevel = 4 },

            new RoleSkill { RoleSkillId = 33, TargetRole = "Quality Assurance", SkillId = 1, RequiredLevel = 3 },
            new RoleSkill { RoleSkillId = 34, TargetRole = "Quality Assurance", SkillId = 9, RequiredLevel = 3 },
            new RoleSkill { RoleSkillId = 35, TargetRole = "Quality Assurance", SkillId = 8, RequiredLevel = 2 }
        );
    }
}
