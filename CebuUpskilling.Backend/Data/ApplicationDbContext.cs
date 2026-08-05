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

        modelBuilder.Entity<Discipline>().HasData(
            new Discipline { DomainId = 1, Name = "Science", Description = "Natural and applied sciences" },
            new Discipline { DomainId = 2, Name = "Arts", Description = "Liberal arts and humanities" },
            new Discipline { DomainId = 3, Name = "Technology", Description = "Computer Science, Information Systems, Engineering" },
            new Discipline { DomainId = 4, Name = "Business", Description = "Business and management" }
        );
    }
}
