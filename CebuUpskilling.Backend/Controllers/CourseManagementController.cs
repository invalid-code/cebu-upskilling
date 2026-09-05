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
            var pc = await db.Courses.AsNoTracking().AsSplitQuery().Include(x => x.Modules.OrderBy(m => m.Order)).ThenInclude(m => m.Lessons.OrderBy(l => l.LessonId)).ThenInclude(l => l.LessonContents).Include(x => x.Modules.OrderBy(m => m.Order)).ThenInclude(m => m.Lessons.OrderBy(l => l.LessonId)).ThenInclude(l => l.Media).SingleOrDefaultAsync(x => x.CourseId == id && x.CreatedBy == uid);
            return pc is null ? NotFound() : Ok(ToDto(pc));
        }
        var companyId = await CompanyId();
        if (companyId is null) return Forbid();
        var c = await db.Courses.AsNoTracking().AsSplitQuery().Include(x => x.Modules.OrderBy(m => m.Order)).ThenInclude(m => m.Lessons.OrderBy(l => l.LessonId)).ThenInclude(l => l.LessonContents).Include(x => x.Modules.OrderBy(m => m.Order)).ThenInclude(m => m.Lessons.OrderBy(l => l.LessonId)).ThenInclude(l => l.Media).SingleOrDefaultAsync(x => x.CourseId == id && x.CompanyId == companyId);
        return c is null ? NotFound() : Ok(ToDto(c));
    }

    [HttpPost]
    public async Task<ActionResult<CourseManagementDto>> Create(SaveCourseRequest request) {
        var genreId = await ResolveGenreIdAsync(request.GenreId);
        if (IsCourseProvider()) {
            var uid = UserId().ToString();
            var providerCourse = new Course { CompanyId = null, Name = request.Name.Trim(), Description = request.Description, TechnicalLevel = request.TechnicalLevel, Mode = request.Mode, Price = request.Price, GenreId = genreId, Status = "Draft", CreatedBy = uid, UpdatedBy = uid, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            ApplyModules(providerCourse, request.Modules);
            db.Courses.Add(providerCourse); await db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = providerCourse.CourseId }, ToDto(providerCourse));
        }
        var companyId = await CompanyId();
        if (companyId is null) return Forbid();
        var course = new Course { CompanyId = companyId, Name = request.Name.Trim(), Description = request.Description, TechnicalLevel = request.TechnicalLevel, Mode = request.Mode, Price = request.Price, GenreId = genreId, Status = "Draft" };
        ApplyModules(course, request.Modules);
        db.Courses.Add(course); await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = course.CourseId }, ToDto(course));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CourseManagementDto>> Update(int id, SaveCourseRequest request) {
        if (IsCourseProvider()) {
            var uid = UserId().ToString();
            var pc = await db.Courses.Include(c => c.Modules).ThenInclude(m => m.Lessons).ThenInclude(l => l.Media).SingleOrDefaultAsync(c => c.CourseId == id && c.CreatedBy == uid);
            if (pc is null) return NotFound();
            pc.Name = request.Name.Trim(); pc.Description = request.Description; pc.TechnicalLevel = request.TechnicalLevel; pc.Mode = request.Mode; pc.Price = request.Price; pc.GenreId = await ResolveGenreIdForUpdateAsync(request.GenreId, pc.GenreId); pc.UpdatedBy = uid; pc.UpdatedAt = DateTime.UtcNow;
            var preserved = SnapshotMedia(pc);
            db.Lessons.RemoveRange(pc.Modules.SelectMany(m => m.Lessons)); db.CourseModules.RemoveRange(pc.Modules); pc.Modules = new List<CourseModule>(); ApplyModules(pc, request.Modules); ReattachMedia(pc, preserved);
            await db.SaveChangesAsync(); return Ok(ToDto(pc));
        }
        var companyId = await CompanyId();
        if (companyId is null) return Forbid();
        var course = await db.Courses.Include(c => c.Modules).ThenInclude(m => m.Lessons).ThenInclude(l => l.Media).SingleOrDefaultAsync(c => c.CourseId == id && c.CompanyId == companyId);
        if (course is null) return NotFound();
        course.Name = request.Name.Trim(); course.Description = request.Description; course.TechnicalLevel = request.TechnicalLevel; course.Mode = request.Mode; course.Price = request.Price; course.GenreId = await ResolveGenreIdForUpdateAsync(request.GenreId, course.GenreId);
        var preservedCompany = SnapshotMedia(course);
        db.Lessons.RemoveRange(course.Modules.SelectMany(m => m.Lessons)); db.CourseModules.RemoveRange(course.Modules); course.Modules = new List<CourseModule>(); ApplyModules(course, request.Modules); ReattachMedia(course, preservedCompany);
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

    private async Task<int> ResolveGenreIdAsync(int? requested)
    {
        if (requested is > 0)
        {
            var exists = await db.Genres.AnyAsync(g => g.GenreId == requested.Value);
            if (exists) return requested.Value;
            var fallback = await db.Genres.OrderBy(g => g.GenreId).Select(g => g.GenreId).FirstOrDefaultAsync();
            if (fallback != 0) return fallback;
            if (db.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory") return requested.Value;
            throw new InvalidOperationException("No genres are configured; cannot create course.");
        }
        var first = await db.Genres.OrderBy(g => g.GenreId).Select(g => g.GenreId).FirstOrDefaultAsync();
        if (first != 0) return first;
        if (db.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory") return 1;
        throw new InvalidOperationException("No genres are configured; cannot create course.");
    }

    private async Task<int> ResolveGenreIdForUpdateAsync(int? requested, int current)
    {
        if (requested is null) return current;
        if (requested is > 0)
        {
            var exists = await db.Genres.AnyAsync(g => g.GenreId == requested.Value);
            if (exists) return requested.Value;
            var fallback = await db.Genres.OrderBy(g => g.GenreId).Select(g => g.GenreId).FirstOrDefaultAsync();
            if (fallback != 0) return fallback;
        }
        return current;
    }

    private static void ApplyModules(Course course, IEnumerable<SaveModuleRequest> modules) { foreach (var m in modules.OrderBy(x => x.Order)) { var module = new CourseModule { Course = course, Name = m.Name.Trim(), Description = m.Description, Order = m.Order }; foreach (var l in m.Lessons.OrderBy(x => x.Order)) { var lesson = new Lesson { Course = course, Module = module, Name = l.Name.Trim(), Description = l.Description }; foreach (var c in NormalizeContents(l.Contents)) lesson.LessonContents.Add(c); module.Lessons.Add(lesson); } course.Modules.Add(module); } }

    // Update replaces the whole module/lesson tree (old lessons are deleted,
    // which cascade-deletes their Media rows). Snapshot attached media by
    // position beforehand and re-link copies onto the rebuilt tree so a
    // content edit never wipes previously attached videos/files. Positional
    // matching: module/lesson indexes in request order on both sides.
    private sealed record MediaSnapshot(int ModuleIndex, int LessonIndex, string PathFile, string Type, double MbSize);

    private static List<MediaSnapshot> SnapshotMedia(Course course)
        => course.Modules.OrderBy(m => m.Order)
            .SelectMany((m, mi) => m.Lessons.OrderBy(l => l.LessonId)
                .SelectMany((l, li) => l.Media.Select(md => new MediaSnapshot(mi, li, md.PathFile, md.Type, md.MbSize))))
            .ToList();

    private static void ReattachMedia(Course course, List<MediaSnapshot> preserved)
    {
        if (preserved.Count == 0) return;
        var newModules = course.Modules.OrderBy(m => m.Order).ToList();
        foreach (var group in preserved.GroupBy(p => (p.ModuleIndex, p.LessonIndex)))
        {
            if (group.Key.ModuleIndex >= newModules.Count) continue;
            var newLessons = newModules[group.Key.ModuleIndex].Lessons.ToList();
            if (group.Key.LessonIndex >= newLessons.Count) continue;
            foreach (var snap in group)
                newLessons[group.Key.LessonIndex].Media.Add(new Media
                {
                    PathFile = snap.PathFile,
                    Type = snap.Type,
                    MbSize = snap.MbSize,
                });
        }
    }

    // Content blocks the learner renderer understands (see LessonContent.jsx):
    // text/paragraph, heading, code, and markdown (rendered as sanitized HTML).
    // Blank blocks are dropped; anything else normalizes to text, which
    // renders identically to unknown types.
    private static readonly HashSet<string> KnownBlockTypes = new(StringComparer.OrdinalIgnoreCase) { "text", "paragraph", "heading", "code", "markdown" };

    private static List<LessonContent> NormalizeContents(IEnumerable<SaveLessonContentRequest>? contents)
    {
        var result = new List<LessonContent>();
        if (contents == null) return result;
        var order = 0;
        foreach (var c in contents)
        {
            if (string.IsNullOrWhiteSpace(c?.Content)) continue;
            var blockType = (c.BlockType ?? string.Empty).Trim().ToLowerInvariant();
            if (!KnownBlockTypes.Contains(blockType)) blockType = "text";
            result.Add(new LessonContent { BlockType = blockType, Content = c.Content!.Trim(), LessonOrder = order, TopicOrder = order });
            order++;
        }
        return result;
    }

    private static CourseManagementDto ToDto(Course c) => new(c.CourseId, c.Name, c.Description, c.Status, c.TechnicalLevel, c.Mode, c.Price, c.GenreId, c.Modules.OrderBy(m => m.Order).Select(m => new CourseManagementModuleDto(m.ModuleId, m.Name, m.Description, m.Order, m.Lessons.OrderBy(l => l.LessonId).Select((l, i) => new CourseManagementLessonDto(l.LessonId, l.Name, l.Description, i, l.LessonContents.OrderBy(lc => lc.LessonOrder).Select(lc => new CourseManagementContentDto(lc.ContentId, lc.BlockType, lc.Content, lc.LessonOrder)).ToList(), l.Media.Select(m => new MediaDto(m.MediaId, m.PathFile, m.Type, m.MbSize)).ToList())).ToList())).ToList());
}
