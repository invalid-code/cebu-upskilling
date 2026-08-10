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
    public DbSet<AssessmentQuestion> AssessmentQuestions => Set<AssessmentQuestion>();

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

        modelBuilder.Entity<AssessmentQuestion>()
            .HasOne(q => q.Skill)
            .WithMany()
            .HasForeignKey(q => q.SkillId);

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

        modelBuilder.Entity<AssessmentQuestion>().HasData(
            // JavaScript (SkillId = 1)
            new AssessmentQuestion { AssessmentQuestionId = 1, SkillId = 1, Text = "Which method creates a new array with the results of calling a function on every element?", OptionA = "Array.prototype.forEach", OptionB = "Array.prototype.map", OptionC = "Array.prototype.filter", OptionD = "Array.prototype.reduce", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 2, SkillId = 1, Text = "What does the '===' operator check in JavaScript?", OptionA = "Value only", OptionB = "Type only", OptionC = "Value and type", OptionD = "Reference equality", CorrectOption = 2 },
            new AssessmentQuestion { AssessmentQuestionId = 3, SkillId = 1, Text = "Which keyword creates a block-scoped variable?", OptionA = "var", OptionB = "let", OptionC = "function", OptionD = "global", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 4, SkillId = 1, Text = "What is the output of typeof null?", OptionA = "\"null\"", OptionB = "\"undefined\"", OptionC = "\"object\"", OptionD = "\"boolean\"", CorrectOption = 2 },
            new AssessmentQuestion { AssessmentQuestionId = 5, SkillId = 1, Text = "Which method adds an element to the end of an array?", OptionA = "Array.prototype.unshift()", OptionB = "Array.prototype.push()", OptionC = "Array.prototype.pop()", OptionD = "Array.prototype.shift()", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 6, SkillId = 1, Text = "What is a closure in JavaScript?", OptionA = "A function that has no return value", OptionB = "A function that accesses variables from its outer scope", OptionC = "A function that takes no arguments", OptionD = "A function that calls itself", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 7, SkillId = 1, Text = "Which event fires when an HTML element is clicked?", OptionA = "onmouseover", OptionB = "onchange", OptionC = "onclick", OptionD = "onsubmit", CorrectOption = 2 },
            new AssessmentQuestion { AssessmentQuestionId = 8, SkillId = 1, Text = "What does JSON stand for?", OptionA = "JavaScript Object Notation", OptionB = "Java Source Object Network", OptionC = "JavaScript Online Notation", OptionD = "Java Syntax Object Notation", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 9, SkillId = 1, Text = "Which method converts a JSON string into a JavaScript object?", OptionA = "JSON.stringify()", OptionB = "JSON.parse()", OptionC = "JSON.convert()", OptionD = "JSON.toObject()", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 10, SkillId = 1, Text = "What is the result of 2 + '2' in JavaScript?", OptionA = "4", OptionB = "\"22\"", OptionC = "NaN", OptionD = "TypeError", CorrectOption = 1 },

            // TypeScript (SkillId = 2)
            new AssessmentQuestion { AssessmentQuestionId = 11, SkillId = 2, Text = "What is TypeScript?", OptionA = "A compiled language", OptionB = "A superset of JavaScript", OptionC = "A database query language", OptionD = "A CSS preprocessor", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 12, SkillId = 2, Text = "Which keyword declares a variable that cannot be reassigned?", OptionA = "var", OptionB = "let", OptionC = "const", OptionD = "static", CorrectOption = 2 },
            new AssessmentQuestion { AssessmentQuestionId = 13, SkillId = 2, Text = "What is the 'any' type in TypeScript?", OptionA = "A type for numeric values", OptionB = "A type that disables type checking", OptionC = "A type for string values", OptionD = "A type for boolean values", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 14, SkillId = 2, Text = "How do you define an interface in TypeScript?", OptionA = "class Interface {}", OptionB = "interface IFace {}", OptionC = "type IFace = {}", OptionD = "struct IFace {}", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 15, SkillId = 2, Text = "What is a union type?", OptionA = "A type that combines multiple classes", OptionB = "A type that allows multiple possible types", OptionC = "A type for array elements", OptionD = "A type for function parameters", CorrectOption = 1 },

            // React (SkillId = 3)
            new AssessmentQuestion { AssessmentQuestionId = 16, SkillId = 3, Text = "What is a React component?", OptionA = "A CSS class", OptionB = "A reusable piece of UI", OptionC = "A database table", OptionD = "An HTML element", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 17, SkillId = 3, Text = "Which hook is used for side effects?", OptionA = "useState", OptionB = "useEffect", OptionC = "useContext", OptionD = "useReducer", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 18, SkillId = 3, Text = "What is JSX?", OptionA = "A new programming language", OptionB = "JavaScript XML syntax extension", OptionC = "A CSS framework", OptionD = "A testing library", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 19, SkillId = 3, Text = "How do you pass data from parent to child?", OptionA = "Using state", OptionB = "Using props", OptionC = "Using context only", OptionD = "Using refs", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 20, SkillId = 3, Text = "What is the virtual DOM?", OptionA = "A copy of the real DOM kept in memory", OptionB = "A browser API", OptionC = "A CSS technique", OptionD = "A JavaScript library", CorrectOption = 0 },

            // CSS (SkillId = 4)
            new AssessmentQuestion { AssessmentQuestionId = 21, SkillId = 4, Text = "What does CSS stand for?", OptionA = "Cascading Style Sheets", OptionB = "Computer Style Sheets", OptionC = "Creative Style System", OptionD = "Colorful Style Sheets", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 22, SkillId = 4, Text = "Which property changes text color?", OptionA = "font-color", OptionB = "text-color", OptionC = "color", OptionD = "foreground", CorrectOption = 2 },
            new AssessmentQuestion { AssessmentQuestionId = 23, SkillId = 4, Text = "What is the box model?", OptionA = "A 3D modeling technique", OptionB = "Content, padding, border, margin layout model", OptionC = "A JavaScript concept", OptionD = "A CSS grid system", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 24, SkillId = 4, Text = "Which display value makes an element hidden but retains space?", OptionA = "none", OptionB = "hidden", OptionC = "invisible", OptionD = "block", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 25, SkillId = 4, Text = "What is Flexbox?", OptionA = "A JavaScript library", OptionB = "A CSS layout method for one-dimensional layouts", OptionC = "A HTML element", OptionD = "A CSS reset", CorrectOption = 1 },

            // HTML (SkillId = 5)
            new AssessmentQuestion { AssessmentQuestionId = 26, SkillId = 5, Text = "What does HTML stand for?", OptionA = "Hyper Text Markup Language", OptionB = "High Tech Modern Language", OptionC = "Hyper Transfer Markup Language", OptionD = "Home Tool Markup Language", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 27, SkillId = 5, Text = "Which tag creates a hyperlink?", OptionA = "<link>", OptionB = "<a>", OptionC = "<href>", OptionD = "<url>", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 28, SkillId = 5, Text = "What is the correct way to add an image?", OptionA = "<image src='img.jpg'>", OptionB = "<img href='img.jpg'>", OptionC = "<img src='img.jpg'>", OptionD = "<picture src='img.jpg'>", CorrectOption = 2 },
            new AssessmentQuestion { AssessmentQuestionId = 29, SkillId = 5, Text = "Which attribute provides alternative text for images?", OptionA = "title", OptionB = "alt", OptionC = "description", OptionD = "text", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 30, SkillId = 5, Text = "What is a semantic HTML element?", OptionA = "<div>", OptionB = "<span>", OptionC = "<article>", OptionD = "<b>", CorrectOption = 2 },

            // Node.js (SkillId = 6)
            new AssessmentQuestion { AssessmentQuestionId = 31, SkillId = 6, Text = "What is Node.js?", OptionA = "A frontend framework", OptionB = "A JavaScript runtime built on Chrome's V8", OptionC = "A database", OptionD = "A CSS preprocessor", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 32, SkillId = 6, Text = "Which command initializes a new Node.js project?", OptionA = "node init", OptionB = "npm init", OptionC = "npx create", OptionD = "npm start", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 33, SkillId = 6, Text = "What is npm?", OptionA = "Node Package Manager", OptionB = "New Project Manager", OptionC = "Node Process Manager", OptionD = "Network Protocol Manager", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 34, SkillId = 6, Text = "Which module is used to work with files?", OptionA = "fs", OptionB = "file", OptionC = "files", OptionD = "io", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 35, SkillId = 6, Text = "What is Express.js?", OptionA = "A database", OptionB = "A web application framework for Node.js", OptionC = "A testing library", OptionD = "A CSS framework", CorrectOption = 1 },

            // Python (SkillId = 7)
            new AssessmentQuestion { AssessmentQuestionId = 36, SkillId = 7, Text = "What is Python?", OptionA = "A compiled language", OptionB = "An interpreted high-level programming language", OptionC = "A markup language", OptionD = "A database", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 37, SkillId = 7, Text = "How do you define a function in Python?", OptionA = "function func() {}", OptionB = "def func():", OptionC = "func function() {}", OptionD = "define func() {}", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 38, SkillId = 7, Text = "What is a list in Python?", OptionA = "An immutable sequence", OptionB = "A mutable ordered collection", OptionC = "A key-value pair", OptionD = "A single value", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 39, SkillId = 7, Text = "Which keyword is used for loops?", OptionA = "loop", OptionB = "for", OptionC = "iterate", OptionD = "repeat", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 40, SkillId = 7, Text = "What is PEP 8?", OptionA = "A Python version", OptionB = "Python's style guide", OptionC = "A testing framework", OptionD = "A package manager", CorrectOption = 1 },

            // SQL (SkillId = 8)
            new AssessmentQuestion { AssessmentQuestionId = 41, SkillId = 8, Text = "What does SQL stand for?", OptionA = "Structured Query Language", OptionB = "Simple Query Logic", OptionC = "Standard Question Language", OptionD = "System Query Lookup", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 42, SkillId = 8, Text = "Which command retrieves data?", OptionA = "GET", OptionB = "RETRIEVE", OptionC = "SELECT", OptionD = "FETCH", CorrectOption = 2 },
            new AssessmentQuestion { AssessmentQuestionId = 43, SkillId = 8, Text = "What is a primary key?", OptionA = "A foreign reference", OptionB = "A unique identifier for each row", OptionC = "A column index", OptionD = "A table name", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 44, SkillId = 8, Text = "Which clause filters results?", OptionA = "FILTER", OptionB = "WHERE", OptionC = "HAVING", OptionD = "LIMIT", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 45, SkillId = 8, Text = "What is a JOIN used for?", OptionA = "Deleting rows", OptionB = "Combining rows from two or more tables", OptionC = "Creating tables", OptionD = "Updating records", CorrectOption = 1 },

            // Git (SkillId = 9)
            new AssessmentQuestion { AssessmentQuestionId = 46, SkillId = 9, Text = "What is Git?", OptionA = "A programming language", OptionB = "A distributed version control system", OptionC = "A database", OptionD = "An operating system", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 47, SkillId = 9, Text = "Which command stages changes?", OptionA = "git add", OptionB = "git stage", OptionC = "git commit", OptionD = "git push", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 48, SkillId = 9, Text = "What does 'git clone' do?", OptionA = "Creates a branch", OptionB = "Creates a copy of a repository", OptionC = "Deletes a file", OptionD = "Merges branches", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 49, SkillId = 9, Text = "Which command shows commit history?", OptionA = "git log", OptionB = "git history", OptionC = "git show", OptionD = "git list", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 50, SkillId = 9, Text = "What is a branch?", OptionA = "A file type", OptionB = "An independent line of development", OptionC = "A merge conflict", OptionD = "A remote repository", CorrectOption = 1 },

            // REST APIs (SkillId = 10)
            new AssessmentQuestion { AssessmentQuestionId = 51, SkillId = 10, Text = "What does REST stand for?", OptionA = "Representational State Transfer", OptionB = "Remote Execution Standard Transfer", OptionC = "Resource Entity State Technology", OptionD = "Real-time Event System Transfer", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 52, SkillId = 10, Text = "Which HTTP method is used to create a resource?", OptionA = "GET", OptionB = "POST", OptionC = "PUT", OptionD = "DELETE", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 53, SkillId = 10, Text = "What is a status code 200?", OptionA = "Not Found", OptionB = "Created", OptionC = "OK", OptionD = "Bad Request", CorrectOption = 2 },
            new AssessmentQuestion { AssessmentQuestionId = 54, SkillId = 10, Text = "What is a REST API endpoint?", OptionA = "A database table", OptionB = "A specific URL where an API can be accessed", OptionC = "A JavaScript function", OptionD = "A CSS selector", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 55, SkillId = 10, Text = "Which format is commonly used for API responses?", OptionA = "XML only", OptionB = "CSV only", OptionC = "JSON", OptionD = "HTML only", CorrectOption = 2 },

            // Vue.js (SkillId = 11)
            new AssessmentQuestion { AssessmentQuestionId = 56, SkillId = 11, Text = "What is Vue.js?", OptionA = "A backend framework", OptionB = "A progressive JavaScript framework", OptionC = "A database", OptionD = "A CSS library", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 57, SkillId = 11, Text = "What is a Vue component?", OptionA = "A CSS class", OptionB = "An encapsulated reusable UI piece", OptionC = "A database model", OptionD = "An HTML template only", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 58, SkillId = 11, Text = "Which directive binds data to the DOM?", OptionA = "v-bind", OptionB = "v-model", OptionC = "v-show", OptionD = "v-for", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 59, SkillId = 11, Text = "What is the Composition API?", OptionA = "A CSS technique", OptionB = "A way to organize component logic using functions", OptionC = "A routing system", OptionD = "A state management only", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 60, SkillId = 11, Text = "How do you create a reactive variable?", OptionA = "var x = 0", OptionB = "ref(0)", OptionC = "reactive(0)", OptionD = "state(0)", CorrectOption = 1 },

            // Angular (SkillId = 12)
            new AssessmentQuestion { AssessmentQuestionId = 61, SkillId = 12, Text = "What is Angular?", OptionA = "A JavaScript library", OptionB = "A platform for building mobile and desktop apps", OptionC = "A CSS framework", OptionD = "A database", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 62, SkillId = 12, Text = "What is a component in Angular?", OptionA = "A CSS file", OptionB = "A class with a template that controls a view", OptionC = "A database table", OptionD = "An HTML attribute", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 63, SkillId = 12, Text = "Which decorator marks a class as a component?", OptionA = "@Component", OptionB = "@View", OptionC = "@Template", OptionD = "@Module", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 64, SkillId = 12, Text = "What is TypeScript in Angular?", OptionA = "A CSS preprocessor", OptionB = "A superset of JavaScript used by Angular", OptionC = "A testing framework", OptionD = "A database", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 65, SkillId = 12, Text = "What is data binding?", OptionA = "Connecting to a database", OptionB = "Automatic synchronization between component and view", OptionC = "Importing modules", OptionD = "Creating HTML elements", CorrectOption = 1 },

            // Docker (SkillId = 13)
            new AssessmentQuestion { AssessmentQuestionId = 66, SkillId = 13, Text = "What is Docker?", OptionA = "A programming language", OptionB = "A containerization platform", OptionC = "A database", OptionD = "An IDE", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 67, SkillId = 13, Text = "What is a Docker image?", OptionA = "A running container", OptionB = "A read-only template for creating containers", OptionC = "A Dockerfile", OptionD = "A virtual machine", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 68, SkillId = 13, Text = "Which command builds a Docker image?", OptionA = "docker build", OptionB = "docker create", OptionC = "docker run", OptionD = "docker start", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 69, SkillId = 13, Text = "What is a Dockerfile?", OptionA = "A configuration file for Docker Desktop", OptionB = "A text file with instructions to build an image", OptionC = "A container log", OptionD = "A network config", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 70, SkillId = 13, Text = "What is container orchestration?", OptionA = "Creating single containers", OptionB = "Managing multiple containers at scale", OptionC = "Building Docker images", OptionD = "Writing Dockerfiles", CorrectOption = 1 },

            // AWS (SkillId = 14)
            new AssessmentQuestion { AssessmentQuestionId = 71, SkillId = 14, Text = "What is AWS?", OptionA = "A programming language", OptionB = "A cloud computing platform", OptionC = "A database", OptionD = "An operating system", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 72, SkillId = 14, Text = "What is an EC2 instance?", OptionA = "A database", OptionB = "A virtual server in the cloud", OptionC = "A storage bucket", OptionD = "A network load balancer", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 73, SkillId = 14, Text = "What is S3 used for?", OptionA = "Computing", OptionB = "Object storage", OptionC = "Database management", OptionD = "Email hosting", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 74, SkillId = 14, Text = "What is a VPC?", OptionA = "A virtual private cloud - isolated network", OptionB = "A very private computer", OptionC = "A video processing center", OptionD = "A visual programming code", CorrectOption = 0 },
            new AssessmentQuestion { AssessmentQuestionId = 75, SkillId = 14, Text = "What is IAM?", OptionA = "Identity and Access Management", OptionB = "Internet Application Manager", OptionC = "Integrated AWS Monitor", OptionD = "Internal API Middleware", CorrectOption = 0 },

            // Figma (SkillId = 15)
            new AssessmentQuestion { AssessmentQuestionId = 76, SkillId = 15, Text = "What is Figma?", OptionA = "A code editor", OptionB = "A collaborative interface design tool", OptionC = "A database", OptionD = "A testing framework", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 77, SkillId = 15, Text = "What is a component in Figma?", OptionA = "A code snippet", OptionB = "A reusable design element", OptionC = "A file type", OptionD = "An export format", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 78, SkillId = 15, Text = "What is auto layout?", OptionA = "Manual positioning", OptionB = "A feature that creates responsive layouts automatically", OptionC = "A CSS property", OptionD = "A grid system", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 79, SkillId = 15, Text = "What are variants in Figma?", OptionA = "Different files", OptionB = "Different versions of a component", OptionC = "Color schemes", OptionD = "Font styles", CorrectOption = 1 },
            new AssessmentQuestion { AssessmentQuestionId = 80, SkillId = 15, Text = "What is Dev Mode in Figma?", OptionA = "A code editor", OptionB = "A mode for developers to inspect designs and get code", OptionC = "A testing tool", OptionD = "A deployment feature", CorrectOption = 1 }
        );
    }
}
