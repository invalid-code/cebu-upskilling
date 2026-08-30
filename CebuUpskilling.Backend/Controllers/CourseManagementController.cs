using System.Security.Claims;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Controllers;

[ApiController]
[Route("api/company/courses")]
[Authorize(Roles = "Recruiter,CourseProvider")]
public class CourseManagementController(ApplicationDbContext db) : ControllerBase
{
    private async Task<int?> CompanyId() {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(raw, out var userId)) return null;
        return await db.Users.Where(u => u.UserId == userId).Select(u => u.CompanyId).SingleOrDefaultAsync();
    }

    private int UserId() => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    private bool IsCourseProvider() => User.IsInRole("CourseProvider");

    private bool IsRecruiter() => User.IsInRole("Recruiter");

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CourseManagementListDto>>> List() {
        if (IsCourseProvider()) {
            var uid = UserId().ToString();
            var providerCourses = await db.Courses.AsNoTracking()
                .Where(c => c.CreatedBy == uid)
                .OrderByDescending(c => c.UpdatedAt)
                .Select(c => new CourseManagementListDto(c.CourseId, c.Name, c.Description, c.Status, c.TechnicalLevel, c.Mode, c.Modules.Count, c.Lessons.Count, c.UpdatedAt)).ToListAsync();
            return Ok(providerCourses);
        }
        var companyId = await CompanyId();
        if (companyId is null) return Forbid();
        var courses = await db.Courses.AsNoTracking().Where(c => c.CompanyId == companyId).OrderByDescending(c => c.UpdatedAt)
            .Select(c => new CourseManagementListDto(c.CourseId, c.Name, c.Description, c.Status, c.TechnicalLevel, c.Mode, c.Modules.Count, c.Lessons.Count, c.UpdatedAt)).ToListAsync();
        return Ok(courses);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CourseManagementDto>> Get(int id) {
        if (IsCourseProvider()) {
            var uid = UserId().ToString();
            var pc = await db.Courses.AsNoTracking().Include(x => x.Modules.OrderBy(m => m.Order)).ThenInclude(m => m.Lessons.OrderBy(l => l.LessonId)).SingleOrDefaultAsync(x => x.CourseId == id && x.CreatedBy == uid);
            return pc is null ? NotFound() : Ok(ToDto(pc));
        }
        var companyId = await CompanyId();
        if (companyId is null) return Forbid();
        var c = await db.Courses.AsNoTracking().Include(x => x.Modules.OrderBy(m => m.Order)).ThenInclude(m => m.Lessons.OrderBy(l => l.LessonId)).SingleOrDefaultAsync(x => x.CourseId == id && x.CompanyId == companyId);
        return c is null ? NotFound() : Ok(ToDto(c));
    }

    [HttpPost]
    public async Task<ActionResult<CourseManagementDto>> Create(SaveCourseRequest request) {
        if (IsCourseProvider()) {
            var uid = UserId().ToString();
            var providerCourse = new Course { CompanyId = null, Name = request.Name.Trim(), Description = request.Description, TechnicalLevel = request.TechnicalLevel, Mode = request.Mode, Price = request.Price, GenreId = request.GenreId ?? 1, Status = "Draft", CreatedBy = uid, UpdatedBy = uid, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            ApplyModules(providerCourse, request.Modules);
            db.Courses.Add(providerCourse); await db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = providerCourse.CourseId }, ToDto(providerCourse));
        }
        var companyId = await CompanyId();
        if (companyId is null) return Forbid();
        var course = new Course { CompanyId = companyId, Name = request.Name.Trim(), Description = request.Description, TechnicalLevel = request.TechnicalLevel, Mode = request.Mode, Price = request.Price, GenreId = request.GenreId ?? 1, Status = "Draft" };
        ApplyModules(course, request.Modules);
        db.Courses.Add(course); await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = course.CourseId }, ToDto(course));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CourseManagementDto>> Update(int id, SaveCourseRequest request) {
        if (IsCourseProvider()) {
            var uid = UserId().ToString();
            var pc = await db.Courses.Include(c => c.Modules).ThenInclude(m => m.Lessons).SingleOrDefaultAsync(c => c.CourseId == id && c.CreatedBy == uid);
            if (pc is null) return NotFound();
            pc.Name = request.Name.Trim(); pc.Description = request.Description; pc.TechnicalLevel = request.TechnicalLevel; pc.Mode = request.Mode; pc.Price = request.Price; pc.GenreId = request.GenreId ?? pc.GenreId; pc.UpdatedBy = uid; pc.UpdatedAt = DateTime.UtcNow;
            db.Lessons.RemoveRange(pc.Modules.SelectMany(m => m.Lessons)); db.CourseModules.RemoveRange(pc.Modules); pc.Modules = new List<CourseModule>(); ApplyModules(pc, request.Modules);
            await db.SaveChangesAsync(); return Ok(ToDto(pc));
        }
        var companyId = await CompanyId();
        if (companyId is null) return Forbid();
        var course = await db.Courses.Include(c => c.Modules).ThenInclude(m => m.Lessons).SingleOrDefaultAsync(c => c.CourseId == id && c.CompanyId == companyId);
        if (course is null) return NotFound();
        course.Name = request.Name.Trim(); course.Description = request.Description; course.TechnicalLevel = request.TechnicalLevel; course.Mode = request.Mode; course.Price = request.Price; course.GenreId = request.GenreId ?? course.GenreId;
        db.Lessons.RemoveRange(course.Modules.SelectMany(m => m.Lessons)); db.CourseModules.RemoveRange(course.Modules); course.Modules = new List<CourseModule>(); ApplyModules(course, request.Modules);
        await db.SaveChangesAsync(); return Ok(ToDto(course));
    }

    [HttpPost("{id:int}/publish")]
    public async Task<IActionResult> Publish(int id, [FromQuery] bool published = true) {
        if (IsCourseProvider()) {
            var uid = UserId().ToString();
            var pc = await db.Courses.SingleOrDefaultAsync(c => c.CourseId == id && c.CreatedBy == uid); if (pc is null) return NotFound();
            pc.Status = published ? "Published" : "Draft"; pc.UpdatedBy = uid; pc.UpdatedAt = DateTime.UtcNow; await db.SaveChangesAsync(); return NoContent();
        }
        var companyId = await CompanyId(); if (companyId is null) return Forbid();
        var course = await db.Courses.SingleOrDefaultAsync(c => c.CourseId == id && c.CompanyId == companyId); if (course is null) return NotFound();
        course.Status = published ? "Published" : "Draft"; await db.SaveChangesAsync(); return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id) {
        if (IsCourseProvider()) {
            var uid = UserId().ToString();
            var pc = await db.Courses.SingleOrDefaultAsync(c => c.CourseId == id && c.CreatedBy == uid); if (pc is null) return NotFound();
            db.Courses.Remove(pc); await db.SaveChangesAsync(); return NoContent();
        }
        var companyId = await CompanyId(); if (companyId is null) return Forbid();
        var course = await db.Courses.SingleOrDefaultAsync(c => c.CourseId == id && c.CompanyId == companyId); if (course is null) return NotFound();
        db.Courses.Remove(course); await db.SaveChangesAsync(); return NoContent();
    }

    private static void ApplyModules(Course course, IEnumerable<SaveModuleRequest> modules) { foreach (var m in modules.OrderBy(x => x.Order)) { var module = new CourseModule { Course = course, Name = m.Name.Trim(), Description = m.Description, Order = m.Order }; foreach (var l in m.Lessons.OrderBy(x => x.Order)) module.Lessons.Add(new Lesson { Course = course, Module = module, Name = l.Name.Trim(), Description = l.Description }); course.Modules.Add(module); } }
    private static CourseManagementDto ToDto(Course c) => new(c.CourseId, c.Name, c.Description, c.Status, c.TechnicalLevel, c.Mode, c.Price, c.GenreId, c.Modules.OrderBy(m => m.Order).Select(m => new CourseManagementModuleDto(m.ModuleId, m.Name, m.Description, m.Order, m.Lessons.OrderBy(l => l.LessonId).Select((l, i) => new CourseManagementLessonDto(l.LessonId, l.Name, l.Description, i)).ToList())).ToList());
}
