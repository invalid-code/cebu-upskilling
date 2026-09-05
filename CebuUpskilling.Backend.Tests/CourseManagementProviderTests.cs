using System.Security.Claims;
using CebuUpskilling.Backend.Controllers;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CebuUpskilling.Backend.Tests;

public class CourseManagementProviderTests
{
    private static CourseManagementController CreateController(Backend.Data.ApplicationDbContext db, int userId, string role, int? companyId = null)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Role, role),
        };
        // IsInRole checks role claim type; need both ClaimTypes.Role and the role value
        var identity = new ClaimsIdentity(claims, "test");
        var principal = new ClaimsPrincipal(identity);
        var controller = new CourseManagementController(db)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = principal } }
        };
        return controller;
    }

    private static async Task<(Backend.Data.ApplicationDbContext db, AppUser recruiter, AppUser provider, Company company)> SeedAsync()
    {
        var db = TestDbContextFactory.Create();
        var company = new Company { Name = "Acme" };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        var recruiter = new AppUser { FirstName = "Rec", LastName = "One", EmailAddress = "rec@example.com", Role = "Recruiter", CompanyId = company.CompanyId };
        var provider = new AppUser { FirstName = "Prov", LastName = "One", EmailAddress = "prov@example.com", Role = "CourseProvider", CompanyId = null };
        var provider2 = new AppUser { FirstName = "Prov2", LastName = "Two", EmailAddress = "prov2@example.com", Role = "CourseProvider", CompanyId = null };
        db.Users.AddRange(recruiter, provider, provider2);
        await db.SaveChangesAsync();
        return (db, recruiter, provider, company);
    }

    private static SaveCourseRequest ValidRequest() => new()
    {
        Name = "Intro to Testing",
        Description = "desc",
        TechnicalLevel = 2,
        Mode = "Online",
        Price = 100,
        GenreId = 1,
        Modules = new List<SaveModuleRequest>
        {
            new() { Name = "M1", Order = 1, Lessons = new List<SaveLessonRequest> { new() { Name = "L1", Order = 1 } } }
        }
    };

    [Fact]
    public async Task List_Recruiter_ReturnsOnlyCompanyCourses()
    {
        var (db, recruiter, provider, company) = await SeedAsync();
        db.Courses.Add(new Course { Name = "CompanyCourse", CompanyId = company.CompanyId, GenreId = 1, Status = "Draft", CreatedBy = recruiter.UserId.ToString() });
        db.Courses.Add(new Course { Name = "ProviderCourse", CompanyId = null, GenreId = 1, Status = "Draft", CreatedBy = provider.UserId.ToString() });
        await db.SaveChangesAsync();

        var ctrl = CreateController(db, recruiter.UserId, "Recruiter");
        var result = await ctrl.List();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<CourseManagementListDto>>(ok.Value);
        Assert.Single(list);
        Assert.Equal("CompanyCourse", list.First().Name);
    }

    [Fact]
    public async Task List_Provider_ReturnsOnlyCreatedByCourses()
    {
        var (db, recruiter, provider, company) = await SeedAsync();
        db.Courses.Add(new Course { Name = "CompanyCourse", CompanyId = company.CompanyId, GenreId = 1, Status = "Draft", CreatedBy = recruiter.UserId.ToString() });
        db.Courses.Add(new Course { Name = "ProviderCourse", CompanyId = null, GenreId = 1, Status = "Draft", CreatedBy = provider.UserId.ToString() });
        await db.SaveChangesAsync();

        var ctrl = CreateController(db, provider.UserId, "CourseProvider");
        var result = await ctrl.List();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<CourseManagementListDto>>(ok.Value);
        Assert.Single(list);
        Assert.Equal("ProviderCourse", list.First().Name);
    }

    [Fact]
    public async Task List_Provider_Isolation_OtherProviderNotVisible()
    {
        var (db, _, provider, _) = await SeedAsync();
        var otherProvider = db.Users.Single(u => u.EmailAddress == "prov2@example.com");
        db.Courses.Add(new Course { Name = "Other", CompanyId = null, GenreId = 1, Status = "Draft", CreatedBy = otherProvider.UserId.ToString() });
        await db.SaveChangesAsync();

        var ctrl = CreateController(db, provider.UserId, "CourseProvider");
        var result = await ctrl.List();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<CourseManagementListDto>>(ok.Value);
        Assert.Empty(list);
    }

    [Fact]
    public async Task Get_Provider_NotFoundForOtherOwnersCourse()
    {
        var (db, recruiter, provider, company) = await SeedAsync();
        var c = new Course { Name = "Comp", CompanyId = company.CompanyId, GenreId = 1, Status = "Draft", CreatedBy = recruiter.UserId.ToString() };
        db.Courses.Add(c); await db.SaveChangesAsync();

        var ctrl = CreateController(db, provider.UserId, "CourseProvider");
        var result = await ctrl.Get(c.CourseId);
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Get_Provider_OwnCourse_ReturnsOk()
    {
        var (db, _, provider, _) = await SeedAsync();
        var c = new Course { Name = "Prov", CompanyId = null, GenreId = 1, Status = "Draft", CreatedBy = provider.UserId.ToString() };
        db.Courses.Add(c); await db.SaveChangesAsync();

        var ctrl = CreateController(db, provider.UserId, "CourseProvider");
        var result = await ctrl.Get(c.CourseId);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<CourseManagementDto>(ok.Value);
        Assert.Equal("Prov", dto.Name);
    }

    [Fact]
    public async Task Get_Recruiter_NotFoundForProviderCourse()
    {
        var (db, recruiter, provider, _) = await SeedAsync();
        var c = new Course { Name = "Prov", CompanyId = null, GenreId = 1, Status = "Draft", CreatedBy = provider.UserId.ToString() };
        db.Courses.Add(c); await db.SaveChangesAsync();

        var ctrl = CreateController(db, recruiter.UserId, "Recruiter");
        var result = await ctrl.Get(c.CourseId);
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_Provider_SetsCompanyIdNullAndCreatedBy()
    {
        var (db, _, provider, _) = await SeedAsync();
        var ctrl = CreateController(db, provider.UserId, "CourseProvider");
        var result = await ctrl.Create(ValidRequest());
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<CourseManagementDto>(created.Value);
        Assert.Equal("Intro to Testing", dto.Name);
        var saved = db.Courses.Single(c => c.CourseId == dto.CourseId);
        Assert.Null(saved.CompanyId);
        Assert.Equal(provider.UserId.ToString(), saved.CreatedBy);
        Assert.Equal(provider.UserId.ToString(), saved.UpdatedBy);
    }

    [Fact]
    public async Task Create_Recruiter_SetsCompanyIdAndDraft()
    {
        var (db, recruiter, _, company) = await SeedAsync();
        var ctrl = CreateController(db, recruiter.UserId, "Recruiter");
        var result = await ctrl.Create(ValidRequest());
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<CourseManagementDto>(created.Value);
        var saved = db.Courses.Single(c => c.CourseId == dto.CourseId);
        Assert.Equal(company.CompanyId, saved.CompanyId);
        Assert.Equal("Draft", saved.Status);
    }

    private static SaveCourseRequest RequestWithContents() => new()
    {
        Name = "Content Course",
        Description = "desc",
        TechnicalLevel = 2,
        Mode = "Online",
        GenreId = 1,
        Modules = new List<SaveModuleRequest>
        {
            new() { Name = "M1", Order = 1, Lessons = new List<SaveLessonRequest>
            {
                new() { Name = "L1", Order = 1, Contents = new List<SaveLessonContentRequest>
                {
                    new() { BlockType = "heading", Content = "Welcome" },
                    new() { BlockType = "text", Content = "Hello world" },
                    new() { BlockType = "code", Content = "console.log(1)" },
                    new() { BlockType = "text", Content = "   " },
                    new() { BlockType = "mystery", Content = "Falls back to text" },
                } }
            } }
        }
    };

    [Fact]
    public async Task Create_WithLessonContents_PersistsNormalizedBlocks()
    {
        var (db, recruiter, _, _) = await SeedAsync();
        var ctrl = CreateController(db, recruiter.UserId, "Recruiter");
        var result = await ctrl.Create(RequestWithContents());
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<CourseManagementDto>(created.Value);

        var contents = dto.Modules.Single().Lessons.Single().Contents;
        Assert.Equal(4, contents.Count);
        Assert.Equal("heading", contents[0].BlockType);
        Assert.Equal("Welcome", contents[0].Content);
        Assert.Equal("text", contents[1].BlockType);
        Assert.Equal("code", contents[2].BlockType);
        Assert.Equal("text", contents[3].BlockType);
        Assert.Equal("Falls back to text", contents[3].Content);
        Assert.Equal(new[] { 0, 1, 2, 3 }, contents.Select(c => c.LessonOrder));
        Assert.Equal(4, db.LessonContents.Count());
    }

    [Fact]
    public async Task Create_WithMarkdownBlock_PersistsAsIs()
    {
        var (db, recruiter, _, _) = await SeedAsync();
        var ctrl = CreateController(db, recruiter.UserId, "Recruiter");
        var req = ValidRequest();
        req.Modules[0].Lessons[0].Contents = new List<SaveLessonContentRequest>
        {
            new() { BlockType = "markdown", Content = "# Hello\n\nSome text" },
        };
        var result = await ctrl.Create(req);
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<CourseManagementDto>(created.Value);

        var contents = dto.Modules.Single().Lessons.Single().Contents;
        var single = Assert.Single(contents);
        Assert.Equal("markdown", single.BlockType);
        Assert.Equal("# Hello\n\nSome text", single.Content);
    }

    [Fact]
    public async Task Update_ReplacesLessonContents()
    {
        var (db, recruiter, _, _) = await SeedAsync();
        var ctrl = CreateController(db, recruiter.UserId, "Recruiter");
        var created = Assert.IsType<CreatedAtActionResult>((await ctrl.Create(RequestWithContents())).Result);
        var dto = Assert.IsType<CourseManagementDto>(created.Value);

        var req = RequestWithContents();
        req.Modules[0].Lessons[0].Contents = new List<SaveLessonContentRequest>
        {
            new() { BlockType = "text", Content = "Brand new" },
        };
        var result = await ctrl.Update(dto.CourseId, req);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var updated = Assert.IsType<CourseManagementDto>(ok.Value);

        var contents = updated.Modules.Single().Lessons.Single().Contents;
        var single = Assert.Single(contents);
        Assert.Equal("Brand new", single.Content);
        Assert.Single(db.LessonContents.ToList());
    }

    [Fact]
    public async Task Get_ReturnsLessonMedia()
    {
        var (db, recruiter, _, company) = await SeedAsync();
        var c = new Course { Name = "Media Course", CompanyId = company.CompanyId, GenreId = 1, Status = "Draft" };
        db.Courses.Add(c); await db.SaveChangesAsync();
        var module = new CourseModule { CourseId = c.CourseId, Name = "M1", Order = 1 };
        db.CourseModules.Add(module); await db.SaveChangesAsync();
        var lesson = new Lesson { CourseId = c.CourseId, ModuleId = module.ModuleId, Name = "L1" };
        db.Lessons.Add(lesson); await db.SaveChangesAsync();
        db.Media.Add(new Media { LessonId = lesson.LessonId, PathFile = "https://media.example.com/handout.pdf", Type = "application/pdf", MbSize = 1.5 });
        await db.SaveChangesAsync();

        var ctrl = CreateController(db, recruiter.UserId, "Recruiter");
        var result = await ctrl.Get(c.CourseId);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<CourseManagementDto>(ok.Value);

        var media = Assert.Single(dto.Modules.Single().Lessons.Single().Media);
        Assert.Equal("https://media.example.com/handout.pdf", media.PathFile);
        Assert.Equal("application/pdf", media.Type);
    }

    [Fact]
    public async Task Update_Provider_NotFound_ForOthersCourse()
    {
        var (db, recruiter, provider, company) = await SeedAsync();
        var c = new Course { Name = "Comp", CompanyId = company.CompanyId, GenreId = 1, Status = "Draft", CreatedBy = recruiter.UserId.ToString() };
        db.Courses.Add(c); await db.SaveChangesAsync();
        var ctrl = CreateController(db, provider.UserId, "CourseProvider");
        var result = await ctrl.Update(c.CourseId, ValidRequest());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Update_PreservesAttachedLessonMedia()
    {
        var (db, recruiter, _, company) = await SeedAsync();
        var c = new Course { Name = "Media Course", CompanyId = company.CompanyId, GenreId = 1, Status = "Draft" };
        db.Courses.Add(c); await db.SaveChangesAsync();
        var module = new CourseModule { CourseId = c.CourseId, Name = "M1", Order = 1 };
        db.CourseModules.Add(module); await db.SaveChangesAsync();
        var lesson = new Lesson { CourseId = c.CourseId, ModuleId = module.ModuleId, Name = "L1" };
        db.Lessons.Add(lesson); await db.SaveChangesAsync();
        db.Media.Add(new Media { LessonId = lesson.LessonId, PathFile = "https://media.example.com/intro.mp4", Type = "video/mp4", MbSize = 12.5 });
        await db.SaveChangesAsync();

        var ctrl = CreateController(db, recruiter.UserId, "Recruiter");
        var result = await ctrl.Update(c.CourseId, ValidRequest());
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<CourseManagementDto>(ok.Value);

        var media = Assert.Single(dto.Modules.Single().Lessons.Single().Media);
        Assert.Equal("https://media.example.com/intro.mp4", media.PathFile);
        Assert.Single(db.Media.ToList());
    }

    [Fact]
    public async Task Update_Provider_SucceedsForOwnCourse()
    {
        var (db, _, provider, _) = await SeedAsync();
        var c = new Course { Name = "Old", CompanyId = null, GenreId = 1, Status = "Draft", CreatedBy = provider.UserId.ToString(), UpdatedBy = provider.UserId.ToString() };
        db.Courses.Add(c); await db.SaveChangesAsync();
        var ctrl = CreateController(db, provider.UserId, "CourseProvider");
        var req = ValidRequest(); req.Name = "New Name";
        var result = await ctrl.Update(c.CourseId, req);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<CourseManagementDto>(ok.Value);
        Assert.Equal("New Name", dto.Name);
        Assert.Equal(provider.UserId.ToString(), db.Courses.Single(x => x.CourseId == c.CourseId).UpdatedBy);
    }

    [Fact]
    public async Task Publish_Provider_UpdatesOwnCourse()
    {
        var (db, _, provider, _) = await SeedAsync();
        var c = new Course { Name = "C", CompanyId = null, GenreId = 1, Status = "Draft", CreatedBy = provider.UserId.ToString() };
        db.Courses.Add(c); await db.SaveChangesAsync();
        var ctrl = CreateController(db, provider.UserId, "CourseProvider");
        var res = await ctrl.Publish(c.CourseId, published: true);
        Assert.IsType<NoContentResult>(res);
        Assert.Equal("Published", db.Courses.Single(x => x.CourseId == c.CourseId).Status);
    }

    [Fact]
    public async Task Publish_Provider_NotFound_ForOther()
    {
        var (db, recruiter, provider, company) = await SeedAsync();
        var c = new Course { Name = "C", CompanyId = company.CompanyId, GenreId = 1, Status = "Draft", CreatedBy = recruiter.UserId.ToString() };
        db.Courses.Add(c); await db.SaveChangesAsync();
        var ctrl = CreateController(db, provider.UserId, "CourseProvider");
        var res = await ctrl.Publish(c.CourseId, published: true);
        Assert.IsType<NotFoundResult>(res);
    }

    [Fact]
    public async Task Delete_Provider_RemovesOwnCourse()
    {
        var (db, _, provider, _) = await SeedAsync();
        var c = new Course { Name = "C", CompanyId = null, GenreId = 1, Status = "Draft", CreatedBy = provider.UserId.ToString() };
        db.Courses.Add(c); await db.SaveChangesAsync();
        var ctrl = CreateController(db, provider.UserId, "CourseProvider");
        var res = await ctrl.Delete(c.CourseId);
        Assert.IsType<NoContentResult>(res);
        Assert.Empty(db.Courses.ToList());
    }

    [Fact]
    public async Task Delete_Provider_NotFound_ForOther()
    {
        var (db, recruiter, provider, company) = await SeedAsync();
        var c = new Course { Name = "C", CompanyId = company.CompanyId, GenreId = 1, Status = "Draft", CreatedBy = recruiter.UserId.ToString() };
        db.Courses.Add(c); await db.SaveChangesAsync();
        var ctrl = CreateController(db, provider.UserId, "CourseProvider");
        var res = await ctrl.Delete(c.CourseId);
        Assert.IsType<NotFoundResult>(res);
        Assert.Single(db.Courses.ToList());
    }

    [Fact]
    public async Task Delete_Recruiter_Forbid_WhenNoCompany()
    {
        // recruiter without company should Forbid
        var db = TestDbContextFactory.Create();
        var lonely = new AppUser { FirstName = "Lonely", LastName = "Rec", EmailAddress = "lonely@example.com", Role = "Recruiter", CompanyId = null };
        db.Users.Add(lonely); await db.SaveChangesAsync();
        var c = new Course { Name = "X", CompanyId = 999, GenreId = 1, Status = "Draft", CreatedBy = lonely.UserId.ToString() };
        db.Courses.Add(c); await db.SaveChangesAsync();
        var ctrl = CreateController(db, lonely.UserId, "Recruiter");
        var res = await ctrl.Delete(c.CourseId);
        Assert.IsType<ForbidResult>(res);
    }

    [Fact]
    public async Task List_Recruiter_Forbid_WhenNoCompany()
    {
        var db = TestDbContextFactory.Create();
        var lonely = new AppUser { FirstName = "L", LastName = "R", EmailAddress = "lonely2@example.com", Role = "Recruiter", CompanyId = null };
        db.Users.Add(lonely); await db.SaveChangesAsync();
        var ctrl = CreateController(db, lonely.UserId, "Recruiter");
        var res = await ctrl.List();
        Assert.IsType<ForbidResult>(res.Result);
    }
}
