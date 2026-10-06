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
            var pc = await db.Courses.AsNoTracking().AsSplitQuery().Include(x => x.Modules.OrderBy(m => m.Order)).ThenInclude(m => m.Lessons.OrderBy(l => l.Order).ThenBy(l => l.LessonId)).ThenInclude(l => l.LessonContents).Include(x => x.Modules.OrderBy(m => m.Order)).ThenInclude(m => m.Lessons.OrderBy(l => l.Order).ThenBy(l => l.LessonId)).ThenInclude(l => l.Media).SingleOrDefaultAsync(x => x.CourseId == id && x.CreatedBy == uid);
            return pc is null ? NotFound() : Ok(ToDto(pc));
        }
        var companyId = await CompanyId();
        if (companyId is null) return Forbid();
        var c = await db.Courses.AsNoTracking().AsSplitQuery().Include(x => x.Modules.OrderBy(m => m.Order)).ThenInclude(m => m.Lessons.OrderBy(l => l.Order).ThenBy(l => l.LessonId)).ThenInclude(l => l.LessonContents).Include(x => x.Modules.OrderBy(m => m.Order)).ThenInclude(m => m.Lessons.OrderBy(l => l.Order).ThenBy(l => l.LessonId)).ThenInclude(l => l.Media).SingleOrDefaultAsync(x => x.CourseId == id && x.CompanyId == companyId);
        return c is null ? NotFound() : Ok(ToDto(c));
    }

    [HttpPost]
    public async Task<ActionResult<CourseManagementDto>> Create(SaveCourseRequest request) {
        var genreId = await ResolveGenreIdAsync(request.GenreId);
        if (IsCourseProvider()) {
            var uid = UserId().ToString();
            var providerCourse = new Course { CompanyId = null, Name = request.Name.Trim(), Description = request.Description, TechnicalLevel = request.TechnicalLevel, Mode = request.Mode, Price = request.Price, GenreId = genreId, Status = "Draft", CreatedBy = uid, UpdatedBy = uid, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            SaveTree(providerCourse, request.Modules);
            db.Courses.Add(providerCourse); await db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = providerCourse.CourseId }, ToDto(providerCourse));
        }
        var companyId = await CompanyId();
        if (companyId is null) return Forbid();
        var course = new Course { CompanyId = companyId, Name = request.Name.Trim(), Description = request.Description, TechnicalLevel = request.TechnicalLevel, Mode = request.Mode, Price = request.Price, GenreId = genreId, Status = "Draft" };
        SaveTree(course, request.Modules);
        db.Courses.Add(course); await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = course.CourseId }, ToDto(course));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CourseManagementDto>> Update(int id, SaveCourseRequest request) {
        if (IsCourseProvider()) {
            var uid = UserId().ToString();
            var pc = await db.Courses
                .Include(c => c.Modules).ThenInclude(m => m.Lessons).ThenInclude(l => l.Media)
                .Include(c => c.Modules).ThenInclude(m => m.Lessons).ThenInclude(l => l.LessonContents)
                .AsSplitQuery()
                .SingleOrDefaultAsync(c => c.CourseId == id && c.CreatedBy == uid);
            if (pc is null) return NotFound();
            pc.Name = request.Name.Trim(); pc.Description = request.Description; pc.TechnicalLevel = request.TechnicalLevel; pc.Mode = request.Mode; pc.Price = request.Price; pc.GenreId = await ResolveGenreIdForUpdateAsync(request.GenreId, pc.GenreId); pc.UpdatedBy = uid; pc.UpdatedAt = DateTime.UtcNow;
            SaveTree(pc, request.Modules);
            await db.SaveChangesAsync(); return Ok(ToDto(pc));
        }
        var companyId = await CompanyId();
        if (companyId is null) return Forbid();
        var course = await db.Courses
            .Include(c => c.Modules).ThenInclude(m => m.Lessons).ThenInclude(l => l.Media)
            .Include(c => c.Modules).ThenInclude(m => m.Lessons).ThenInclude(l => l.LessonContents)
            .AsSplitQuery()
            .SingleOrDefaultAsync(c => c.CourseId == id && c.CompanyId == companyId);
        if (course is null) return NotFound();
        course.Name = request.Name.Trim(); course.Description = request.Description; course.TechnicalLevel = request.TechnicalLevel; course.Mode = request.Mode; course.Price = request.Price; course.GenreId = await ResolveGenreIdForUpdateAsync(request.GenreId, course.GenreId); course.UpdatedBy = UserId().ToString(); course.UpdatedAt = DateTime.UtcNow;
        SaveTree(course, request.Modules);
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
        // Deleting cascades to modules, lessons, notes, discussions and
        // enrollments: refuse while learners are enrolled so progress is never
        // destroyed. Unpublish (Draft) instead, or wait until unenrolled.
        if (IsCourseProvider()) {
            var uid = UserId().ToString();
            var pc = await db.Courses.SingleOrDefaultAsync(c => c.CourseId == id && c.CreatedBy == uid); if (pc is null) return NotFound();
            if (await db.LearnerStudyCourses.AnyAsync(lsc => lsc.CourseId == id))
                return Conflict(new { error = "Cannot delete a course with enrolled learners. Unpublish it instead." });
            db.Courses.Remove(pc); await db.SaveChangesAsync(); return NoContent();
        }
        var companyId = await CompanyId(); if (companyId is null) return Forbid();
        var course = await db.Courses.SingleOrDefaultAsync(c => c.CourseId == id && c.CompanyId == companyId); if (course is null) return NotFound();
        if (await db.LearnerStudyCourses.AnyAsync(lsc => lsc.CourseId == id))
            return Conflict(new { error = "Cannot delete a course with enrolled learners. Unpublish it instead." });
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

    // Reconciles the module/lesson tree with the request in place: modules are matched
    // by ModuleId and lessons by LessonId when the client echoes them, so surviving
    // lessons keep their identity — and with it the LearnerNotes and DiscussionPosts
    // that cascade off LessonId. Only rows the client genuinely dropped are deleted.
    private ModuleSyncResult SyncModules(Course course, IEnumerable<SaveModuleRequest> modules)
    {
        var liveModules = new List<CourseModule>();
        var oldModules = course.Modules.OrderBy(m => m.Order).ToList();
        var oldLessons = oldModules.SelectMany(m => m.Lessons).Where(l => l.LessonId > 0).ToList();
        var oldLessonsById = oldLessons.ToDictionary(l => l.LessonId);
        var reusedModules = new HashSet<CourseModule>();
        var reusedLessonIds = new HashSet<int>();

        foreach (var m in modules.OrderBy(x => x.Order))
        {
            CourseModule? module = null;
            if (m.ModuleId is > 0)
            {
                var candidate = oldModules.FirstOrDefault(x => x.ModuleId == m.ModuleId.Value);
                if (candidate is not null && reusedModules.Add(candidate))
                    module = candidate;
            }

            if (module is null)
            {
                module = new CourseModule { Course = course };
                course.Modules.Add(module);
            }
            liveModules.Add(module);

            module.Name = m.Name.Trim();
            module.Description = m.Description;
            module.Order = m.Order;

            foreach (var l in m.Lessons.OrderBy(x => x.Order))
            {
                Lesson? lesson = null;
                if (l.LessonId is > 0
                    && oldLessonsById.TryGetValue(l.LessonId.Value, out var existing)
                    && reusedLessonIds.Add(l.LessonId.Value))
                {
                    lesson = existing;
                }

                if (lesson is null)
                {
                    lesson = new Lesson { Course = course, Module = module };
                    module.Lessons.Add(lesson);
                }
                else if (!ReferenceEquals(lesson.Module, module))
                {
                    lesson.Module = module;
                }

                lesson.Name = l.Name.Trim();
                lesson.Description = l.Description;
                lesson.Order = l.Order;
                lesson.LessonContents.Clear();
                foreach (var c in NormalizeContents(l.Contents))
                    lesson.LessonContents.Add(c);

            }
        }

        var removedLessonIds = new HashSet<int>();
        foreach (var lesson in oldLessons)
        {
            if (reusedLessonIds.Contains(lesson.LessonId)) continue;
            removedLessonIds.Add(lesson.LessonId);
            db.Lessons.Remove(lesson);
        }

        foreach (var module in oldModules)
        {
            if (reusedModules.Contains(module)) continue;
            db.CourseModules.Remove(module);
        }

        return new ModuleSyncResult(liveModules, removedLessonIds);
    }

    private sealed record ModuleSyncResult(List<CourseModule> Modules, HashSet<int> RemovedLessonIds);

    private void SaveTree(Course course, IEnumerable<SaveModuleRequest> modules)
    {
        var preserved = SnapshotMedia(course);
        ReattachMedia(preserved, SyncModules(course, modules));
    }

    private sealed record MediaSnapshot(int LessonId, int ModuleIndex, int LessonIndex, string PathFile, string Type, double MbSize);

    private static List<MediaSnapshot> SnapshotMedia(Course course)
        => course.Modules.OrderBy(m => m.Order)
            .SelectMany((m, mi) => m.Lessons.OrderBy(l => l.Order).ThenBy(l => l.LessonId)
                .SelectMany((l, li) => l.Media.Select(md => new MediaSnapshot(l.LessonId, mi, li, md.PathFile, md.Type, md.MbSize))))
            .ToList();

    // Media on surviving lessons is left alone (its lesson row was never removed).
    // Only media whose lesson the client deleted has to be re-homed, by position
    // on the old tree, so uploads are not silently lost on every save.
    private static void ReattachMedia(List<MediaSnapshot> preserved, ModuleSyncResult sync)
    {
        var lost = preserved.Where(p => sync.RemovedLessonIds.Contains(p.LessonId)).ToList();
        if (lost.Count == 0) return;

        // course.Modules still contains the modules marked for deletion until
        // SaveChanges detaches them, so index into the surviving tree instead.
        var newModules = sync.Modules;
        foreach (var group in lost.GroupBy(p => (p.ModuleIndex, p.LessonIndex)))
        {
            if (group.Key.ModuleIndex >= newModules.Count) continue;
            var candidates = newModules[group.Key.ModuleIndex]
                .Lessons.Where(l => !sync.RemovedLessonIds.Contains(l.LessonId)).ToList();
            if (group.Key.LessonIndex >= candidates.Count) continue;
            var target = candidates[group.Key.LessonIndex];
            foreach (var snap in group)
                target.Media.Add(new Media
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

    private static CourseManagementDto ToDto(Course c) => new(c.CourseId, c.Name, c.Description, c.Status, c.TechnicalLevel, c.Mode, c.Price, c.GenreId, c.Modules.OrderBy(m => m.Order).Select(m => new CourseManagementModuleDto(m.ModuleId, m.Name, m.Description, m.Order, m.Lessons.OrderBy(l => l.Order).ThenBy(l => l.LessonId).Select((l, i) => new CourseManagementLessonDto(l.LessonId, l.Name, l.Description, i, l.LessonContents.OrderBy(lc => lc.LessonOrder).Select(lc => new CourseManagementContentDto(lc.ContentId, lc.BlockType, lc.Content, lc.LessonOrder)).ToList(), l.Media.Select(m => new MediaDto(m.MediaId, m.PathFile, m.Type, m.MbSize)).ToList())).ToList())).ToList());
}
