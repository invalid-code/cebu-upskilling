# Implementation Plan

[Overview]
Make the employer/business side of Cebu Upskilling comprehensive — delivering every promise the CebuUpskillingDocumentation.pdf makes to enterprises (SME-friendly hiring, employer-declared skills & schedules per job, pipeline-candidate access to the talent pool, and talent demand–supply forecasting) — while keeping the existing learner/recruiter separation and company tenancy rules intact.

**What exists today (from investigation):**
- Auth: `RegisterAsync` (Learner or Recruiter) and `CompanyRegisterAsync` (creates `Company`{Name} + Recruiter `AppUser` in a transaction) → `GET/POST /api/companies` (GET public, POST `[Authorize(Roles="Recruiter")]`).
- Job posts: `PostsController` CRUD on `/api/posts`; `PostService` maps `PostRequest` ↔ `PostResponse`; ownership check via `GetUserCompanyIdAsync()`; search/filter via `PostRepository.SearchAsync` (`search`, `targetRole`, `jobType`, `location`, `isRemote`, `sortBy`, paging). `Post` has free-text `Requirements` and `Benefits` but **no structured link to the `Skill` taxonomy** and **no employer-declared schedule field**.
- Applications: `ApplicationsController` `/api/applications` (learner side) + `/api/applications/employer` (recruiter inbox: list, detail with learner skills, status workflow `applied|review|interview|hired|rejected`, email notifications both directions).
- Business stats: `GET /api/stats/business` returns `CompanySummary`, `TalentPoolSummary`, `JobPostingDto[]`, `SkillDemandDto[]` (global demand from `RoleSkill` vs supply from `LearnerSkill`).
- Frontend employer pages: `EmployerOverviewPage`, `BusinessDashboardPage`, `PostJobPage`, `EditJobPage`, `JobApplicationsPage`, with `Sidebar` "Employer tools" nav and `RecruiterRoute`-guarded routes.

**What is missing (the gaps this plan fills, in priority order):**
1. **Employer-declared required skills + schedule per job** (PDF: "Enterprises are required to fill what skills and schedules are needed", and required skills "will be given in the learn area"). No `PostSkill` entity; `Post` has no schedule field; the job form cannot attach taxonomy skills; job detail cannot show required-skill levels. Also the employer-declared skills never flow into `RoleSkill`, so they never reach the learner skill-gap/course-matching engine or the demand forecast.
2. **Recruiter access to the talent pool / pipeline candidates** (PDF: employers "use the system to identify pipeline candidates"). `LearnersController` is `[Authorize(Roles="Learner")]`; recruiters see only the aggregate `TalentPoolSummary`. There is no candidate search endpoint or UI for recruiters.
3. **Talent demand–supply forecasting** (PDF: employers can "forecast talent availability by skill domain, identify gaps in the regional workforce pipeline, and inform upskilling providers of priority skill demands"). `BusinessStatsResponse` has global `SkillDemand` but no per-company demand, no explicit `SkillGap = Demand − Supply`, and no per-post application funnel metrics.
4. **Richer company identity for SME visibility** (PDF: "Small Corporation will be able to place their hirings through the app and will be filtered, to avoid being overshadowed"). `Company` has only `Name`; no industry/size/description/website/logo; no recruiter-facing company profile editing; posts have no company-size facet for filtering/prominence.
5. **Application funnel analytics per job** (supports "tracking hiring demand" and pipeline management): no per-post counts by status surfaced to recruiters.

**Scope & priority rule (confirm from user):** Implement 1–5 end-to-end, in that order, with tests. Deferred / explicitly out of scope for this pass: admin approval of companies, recruiter team management UI, in-app notification feed, numeric salary parsing/filtering, interview scheduling, and reporting exports (listed as follow-ups at the end).

**Design constraints (preserve existing behavior):**
- All new recruiter endpoints use `[Authorize(Roles="Recruiter")]`; company tenancy/ownership checks stay (`application.Post.CompanyId != companyId → Forbid`).
- DTO changes are additive only — existing fields remain, new optional fields default (`Skills = []`, etc.) so current frontend/API consumers keep working.
- Frontend API client must stay XHR-based (`api/client.js`; a browser extension patches `fetch`).
- `FrontendBaseUrl`/`.env`/Vite proxy configuration is untouched.
- Known bug to fix while in these files: `BusinessDashboardPage` calls `api.delete("/api/posts/…")` which double-prefixes the API base — change to `api.delete(\`/posts/${post.postId}\`)`.

---

[Types]
Add structured job-required skills and employer-declared schedule to the data model, extend the `Company` entity for SME identity, and add additive DTOs for candidate search, forecasting, and company profile — without removing or renaming any existing field.

**New entity — `CebuUpskilling.Backend/Entities/PostSkill.cs`**
- `int PostSkillId` (PK, `[Key]`)
- `int PostId` (FK → `Post`, required)
- `int SkillId` (FK → `Skill`, required)
- `int SkillLevel` (0–5; mirrors the 1–5 skill scale; 0 = "nice to have / any level")
- Navigation `Post Post` and `Skill Skill`
- EF config (in `ApplicationDbContext.OnModelCreating`): unique index `(PostId, SkillId)` to prevent duplicates, FKs cascade-delete from `Post`.

**Modified entity — `CebuUpskilling.Backend/Entities/Post.cs`**
- Add `[MaxLength(200)] public string? ScheduleWork` — employer-declared work schedule (e.g. "Graveyard, M–F, hybrid"), per the PDF's "schedules are needed".
- Add `public ICollection<PostSkill> PostSkills { get; set; } = new List<PostSkill>();` alongside existing `PostCourseRequireds`.

**Modified entity — `CebuUpskilling.Backend/Entities/Skill.cs`**
- Add `public ICollection<PostSkill> PostSkills { get; set; } = new List<PostSkill>();` to mirror the `RoleSkills`/`LearnerSkills` collections (required by the `HasMany` mapping).

**Modified entity — `CebuUpskilling.Backend/Entities/Company.cs`**
- Add `[MaxLength(1000)] string? Description`
- Add `[MaxLength(100)] string? Industry`
- Add `[MaxLength(255)] string? Website`
- Add `[MaxLength(50)] string? Size` — values `Micro`, `SME`, `Large` (lowercase-normalized; "SME" is the documented focus)
- Add `[MaxLength(500)] string? LogoUrl`

**New DTOs — `CebuUpskilling.Backend/DTOs/TalentDTOs.cs`**
- `record SkillOptionDto(int SkillId, string Name, string? Category)` — for the recruiter skills picker (`GET /api/talent/skills`)
- `record CandidateSearchParams(string? Search = null, string? SkillName = null, bool? VerifiedOnly = null, int? MinSkillLevel = null, string? TargetRole = null, string? SortBy = "relevance", int Page = 1, int PageSize = 20)`
- `record TalentCandidateDto(int LearnerId, string FullName, string? Email, string? TargetRole, string? Address, bool RemoteFriendly, int VerifiedSkills, int SkillCount, int? AvgSkillLevel, string? ResumeUrl)`
- `record CandidateSkillDto(int SkillId, string SkillName, string? Category, int SkillLevel, bool Verified)`
- `record CandidateDetailDto(int LearnerId, string FullName, string? Email, string? TargetRole, string? Address, bool RemoteFriendly, int? AvgSkillLevel, string? ResumeUrl, List<CandidateSkillDto> Skills)`
- `record PagedCandidatesResponse(List<TalentCandidateDto> Items, int Total, int Page, int PageSize)`

**Modified DTOs — `CebuUpskilling.Backend/DTOs/PostDTOs.cs`**
- Add `record PostSkillRequest(int SkillId, int SkillLevel)` and `record PostSkillDto(int SkillId, string SkillName, string? Category, int SkillLevel)`
- `PostRequest`: add `List<PostSkillRequest>? Skills = null` and `string? ScheduleWork = null` (both optional → backward compatible)
- `PostResponse`: add `List<PostSkillDto> Skills` (default `new()`) and `string? ScheduleWork`
- `PostQueryParams`: add `string? CompanySize = null` (filters `p.Company.Size`; SME-comparability facet) — optional, default null

**Modified DTOs — `CebuUpskilling.Backend/DTOs/BusinessStatsDTOs.cs`**
- Add `record CompanySkillDemandDto(int SkillId, string SkillName, string? Category, int PostingsRequiring, int AvgRequiredLevel, int LearnersWithSkill, double? AvgLearnerLevel)` — this company's declared skill demand vs learner supply
- Add `record TalentForecastDto(string SkillName, string? Category, int DemandRoles, int SupplyLearners, int SkillGap, int AvgRequiredLevel)` where `SupplyLearners` = count of learners with `CurrentLevel > 0`, `SkillGap = max(0, DemandRoles - SupplyLearners)`, `DemandRoles` = number of `RoleSkill` rows for that skill (regional demand; employer-declared skills upsert into `RoleSkill`, so real postings drive this)
- `JobPostingDto`: add `int TotalApplications`, `int ReviewCount`, `int InterviewCount`, `int HiredCount`, `int RejectedCount` (application funnel per job) — additive
- `BusinessStatsResponse`: add `List<CompanySkillDemandDto> CompanySkillDemand` and `List<TalentForecastDto> TalentForecast` (both default `new()`)

**New DTOs — `CebuUpskilling.Backend/DTOs/CompanyDTOs.cs`**
- `record CompanyProfileRequest(string? Description, string? Industry, string? Website, string? Size, string? LogoUrl)`
- `record CompanyProfileResponse(int CompanyId, string Name, string? Description, string? Industry, string? Website, string? Size, string? LogoUrl, int Recruiters, int JobPostings)`

**Validation rules**
- `PostSkillRequest.SkillLevel` must be 0–5 (reject otherwise); duplicate `SkillId` within one post → 400.
- `SkillId` must reference an existing `Skill` (FK constraint + pre-check for a clean 400).
- `Company.Size` must be one of `Micro|SME|Large` (null allowed).
- `CandidateSearchParams.PageSize` clamped 1–100, `Page ≥ 1`, `SortBy` whitelist (`relevance|name|level|newest|alphabetical`).

---

[Files]
Add six new backend files, one new DTO file, one new frontend component and two new frontend pages, plus modify the post, company, stats, repo, service, controller, and employer-UI files; add backend + frontend tests; generate one EF migration.

**New files — backend**
- `CebuUpskilling.Backend/Entities/PostSkill.cs` — entity above
- `CebuUpskilling.Backend/DTOs/TalentDTOs.cs` — DTOs above
- `CebuUpskilling.Backend/DTOs/CompanyDTOs.cs` — DTOs above
- `CebuUpskilling.Backend/Services/TalentPoolService.cs` + interface `ITalentPoolService` — candidate search & detail (Functions below)
- `CebuUpskilling.Backend/Controllers/TalentPoolController.cs` — recruiter endpoints (Functions below)

**New files — frontend**
- `frontend/src/components/jobs/RequiredSkillsPicker.jsx` — multi-select skill picker w/ per-skill level (0–5) dropdown; loads skills from `GET /api/talent/skills`
- `frontend/src/pages/TalentSearchPage.jsx` — recruiter candidate search UI consuming `GET /api/talent/candidates`
- `frontend/src/pages/CompanyProfilePage.jsx` — company identity editing consuming `GET/PUT /api/companies/mine`

**New files — tests**
- `CebuUpskilling.Backend.Tests/PostSkillServiceTests.cs`
- `CebuUpskilling.Backend.Tests/TalentPoolServiceTests.cs`
- `CebuUpskilling.Backend.Tests/CompanyProfileTests.cs` (controller/entity)
- `frontend/src/components/jobs/RequiredSkillsPicker.test.jsx`
- `frontend/src/pages/TalentSearchPage.test.jsx`

**Modified files — backend**
- `CebuUpskilling.Backend/Entities/Post.cs` — add `ScheduleWork`, `ICollection<PostSkill> PostSkills`
- `CebuUpskilling.Backend/Entities/Skill.cs` — add `ICollection<PostSkill> PostSkills`
- `CebuUpskilling.Backend/Entities/Company.cs` — add Description/Industry/Website/Size/LogoUrl
- `CebuUpskilling.Backend/Data/ApplicationDbContext.cs` — add `DbSet<PostSkill> PostSkills`, `OnModelCreating` mapping (unique `(PostId, SkillId)`, FKs)
- `CebuUpskilling.Backend/Migrations/*` — one new migration `AddEmployerSkillsScheduleAndCompanyProfile` (generated via `dotnet ef`; covers PostSkill, Post.ScheduleWork, Company fields)
- `CebuUpskilling.Backend/DTOs/PostDTOs.cs` — additive changes above
- `CebuUpskilling.Backend/DTOs/BusinessStatsDTOs.cs` — additive changes above
- `CebuUpskilling.Backend/Services/EntityServices.cs` — `PostService`: persist/replace `PostSkill` rows in `CreateAsync(PostRequest, companyId)` and `UpdateAsync(id, PostRequest)`; map skills in `ToResponse`; also `Requests→entity` maps `ScheduleWork`. See Functions for the `RoleSkill` upsert (new dependency `IRoleSkillRepository`).
- `CebuUpskilling.Backend/Services/StatsService.cs` — add `GetBusinessStatsAsync(int companyId)` returning the extended `BusinessStatsResponse` (Company, TalentPool, JobPostings + funnel counts, SkillDemand, CompanySkillDemand, TalentForecast)
- `CebuUpskilling.Backend/Controllers/StatsController.cs` — `GetBusinessStats()` delegates to `IStatsService.GetBusinessStatsAsync(companyId)` (keeps same route/response shape + new fields)
- `CebuUpskilling.Backend/Repositories/PostRepository.cs` — `.Include(p => p.PostSkills).ThenInclude(ps => ps.Skill)` in `GetAllAsync`/`GetByIdAsync`/`SearchAsync`; `CountAsync` unchanged; company-size filter in `SearchAsync`
- `CebuUpskilling.Backend/Controllers/PostsController.cs` — no signature change; Create/Update already pass `PostRequest` through; ensure `ScheduleWork`+`Skills` round-trip (they will once service maps them)
- `CebuUpskilling.Backend/Controllers/CompaniesController.cs` — add `GET /api/companies/mine` + `PUT /api/companies/mine` (Recruiter, ownership via `User.CompanyId`); keep existing GET-all/POST-create
- `CebuUpskilling.Backend/Program.cs` — register `ITalentPoolService` (scoped)
- `CebuUpskilling.Backend/Entities/RoleSkill.cs` — no schema change (upsert only, at service level)

**Modified files — frontend**
- `frontend/src/App.jsx` — add routes `/talent` and `/company-profile` inside `RecruiterRoute`
- `frontend/src/components/Layout/Sidebar.jsx` — add "Talent pool" and "Company profile" under Employer tools
- `frontend/src/components/jobs/JobPostForm.jsx` — add `RequiredSkillsPicker` + schedule input; include `skills` and `scheduleWork` in payload; seed from `initial.skills`/`initial.scheduleWork`
- `frontend/src/pages/JobDetailPage.jsx` — render required-skill level badges from `job.skills`, show schedule
- `frontend/src/pages/BusinessDashboardPage.jsx` — render `CompanySkillDemand` table, `TalentForecast` (gap) section, per-posting application funnel counts; **fix delete-URL double-prefix bug**
- `frontend/src/pages/JobsPage.jsx` — optional: add company-size filter chip (uses existing query plumbing; `PostQueryParams.CompanySize`)
- `frontend/src/api/client.js` — unchanged (XHR kept)

**Tests to update**
- `CebuUpskilling.Backend.Tests/StatsServiceTests.cs` — extend for new response fields (additive)
- `CebuUpskilling.Backend.Tests/ApplicationsServiceTests.cs` — run unchanged; update only if assertions reference changed DTOs (should not)
- `frontend/src/pages/BusinessDashboardPage.test.jsx` — expect forecast/demand sections + corrected delete URL
- `frontend/src/components/jobs/JobPostForm.test.jsx` — extend for skills picker + schedule field

**Files deleted/moved:** none.

---

[Functions]
Add candidate-search, forecasting, and company-profile functions, and modify post CRUD to persist structured skills that also feed the `RoleSkill` demand engine — all additive to existing logic.

**New functions — `CebuUpskilling.Backend/Services/TalentPoolService.cs` (`ITalentPoolService`)**
- `Task<PagedCandidatesResponse> GetCandidatesAsync(CandidateSearchParams p)` — queries `Learnars` joined `User` + `LearnerSkills`(+`Skill`); applies `Search` (name/email/role), `SkillName`, `VerifiedOnly`, `MinSkillLevel` (ANY skill in the candidate's set meeting the floor), `TargetRole`; computes `VerifiedSkills`, `SkillCount`, `AvgSkillLevel`; sorts by `SortBy` (`relevance` = most skills first, `level` = avg level desc, `newest` = UserId desc, `name`, `alphabetical`); paginates (clamp 1–100).
- `Task<CandidateDetailDto?> GetCandidateDetailAsync(int learnerId)` — full profile + skills ordered by level desc; null if learner missing. (No company-scoping on the candidate itself — learners are shared regional talent; the *endpoint* is recruiter-only.)
- `Task<List<SkillOptionDto>> GetSkillOptionsAsync()` — all `Skill` records for the picker.

**New functions — `CebuUpskilling.Backend/Controllers/TalentPoolController.cs`** (route `api/talent`, class-level `[Authorize(Roles="Recruiter")]`)
- `GET api/talent/candidates` → `PagedCandidatesResponse` (binds `CandidateSearchParams` from query)
- `GET api/talent/candidates/{learnerId}` → `CandidateDetailDto` / 404
- `GET api/talent/skills` → `List<SkillOptionDto>`

**New functions — `CebuUpskilling.Backend/Controllers/CompaniesController.cs`**
- `GET api/companies/mine` → `CompanyProfileResponse` (from `User.Company`; 400 if no company)
- `PUT api/companies/mine` ([FromBody] `CompanyProfileRequest`) → `CompanyProfileResponse`; validates `Size` enum-whitelist; null fields preserved (partial update)

**Modified functions — `CebuUpskilling.Backend/Services/EntityServices.cs` (`PostService`)**
- `CreateAsync(PostRequest request, int companyId)` — current build of `Post` + save; **extend** to: map `ScheduleWork`; after saving, if `request.Skills` non-empty, persist `PostSkill` rows (validate levels 0–5 and existing SkillIds), then **upsert `RoleSkill`** rows for `(TargetRole, SkillId)` with `RequiredLevel = SkillLevel` (merge: take max of existing vs new) so employer demand feeds `SkillGapService` and `TalentForecast`.
- `UpdateAsync(int id, PostRequest request)` — **extend** to replace the `PostSkill` set (delete existing rows for the post, re-add from `request.Skills`) and re-upsert `RoleSkill`; preserve fields when `request.Skills == null` (no change).
- `ToResponse(Post)` — **extend** to map `PostSkillDto` list (from `p.PostSkills.Select(ps => new PostSkillDto(ps.SkillId, ps.Skill.Name, ps.Skill.Category, ps.SkillLevel))`) and `ScheduleWork`.
- `CreateAsync(Post entity)` / `SaveUpdates` (base overrides) — untouched.

**Modified functions — `CebuUpskilling.Backend/Services/StatsService.cs` (`IStatsService`)**
- Existing `GetWeeklyStatsAsync(int userId)` — unchanged.
- **New** `Task<BusinessStatsResponse> GetBusinessStatsAsync(int companyId)` — move/expand the inline logic currently in `StatsController.GetBusinessStats()`: company summary (name, posts count, recruiters count w/ `Role=="Recruiter"`), talent pool summary (unchanged semantics), job postings list **with per-status application counts**, `SkillDemand` (existing global computation), **new** `CompanySkillDemand` (group company `PostSkill`s by skill: PostingsRequiring, AvgRequiredLevel, LearnersWithSkill, AvgLearnerLevel from `LearnerSkill`), **new** `TalentForecast` (per skill: DemandRoles = `RoleSkill` rows, SupplyLearners = learners with level>0, SkillGap, AvgRequiredLevel).

**Modified functions — `CebuUpskilling.Backend/Controllers/StatsController.cs`**
- `GetBusinessStats()` → `var stats = await _statsService.GetBusinessStatsAsync(companyId); return Ok(stats);` (keeps 400 "No company associated" guard, userId derivation, logging).

**Modified functions — `CebuUpskilling.Backend/Repositories/PostRepository.cs`**
- `GetAllAsync`, `GetByIdAsync`, `SearchAsync` — add skill includes (above). No interface member additions unless `SearchAsync` filter for `CompanySize` is added (it is — `IPostRepository.SearchAsync` already takes `PostQueryParams`, so no interface change).

**Modified frontend functions**
- `JobPostForm` `handleSubmit` — include `skills: [{ skillId, skillLevel }]` and `scheduleWork`.
- `BusinessDashboardPage` `useEffect` — same endpoint; render new sections; delete handler → `api.delete(\`/posts/${post.postId}\`)`.
- `Sidebar`/`App.jsx` — add nav/routes.

**Removed functions:** none.

---

[Classes]
Add three new classes (one entity, one service, one controller) and extend four existing classes additively — nothing is removed or renamed.

**New classes**
- `Entities/PostSkill` — plain EF entity (Types above).
- `Services/TalentPoolService : ITalentPoolService` — ctor deps: `ApplicationDbContext` (query pattern consistent with `AuthService`/`StatsController`) or `ILearnerRepository`+`ILearnerSkillRepository` if preferred; `ILogger<TalentPoolService>`.
- `Controllers/TalentPoolController : ControllerBase` — ctor: `ITalentPoolService`, `ILogger<TalentPoolController>`; class-level `[Authorize(Roles="Recruiter")]`, route `api/talent`.

**Modified classes**
- `Entities/Post` — + `ScheduleWork`, + `ICollection<PostSkill> PostSkills`.
- `Entities/Skill` — + `ICollection<PostSkill> PostSkills`.
- `Entities/Company` — + Description/Industry/Website/Size/LogoUrl.
- `Data/ApplicationDbContext` — + `DbSet<PostSkill>`, mapping blocks.
- `Services/PostService` — + `IRoleSkillRepository _roleSkills` ctor dependency; skill persistence + `RoleSkill` upsert in Create/Update; skill mapping in `ToResponse`.
- `Services/StatsService` — + `GetBusinessStatsAsync(int companyId)`; ctor gains `IApplicationRepository` (funnel counts) if not already present.
- `Controllers/StatsController` — thin delegation (keeps same auth/route).
- `Controllers/CompaniesController` — + `mine` GET/PUT endpoints (keeps existing GET-all/POST-create).
- `Repositories/PostRepository` — + skill includes, + company-size filter in `SearchAsync`.

**Unchanged classes (reference only):** `Application`, `ApplicationsService`, `ApplicationsController`, `PostsController`, `AuthService`, `SkillGapService`, `Learner`, `LearnerSkill`, `LearnerAssessment`, `RoleSkill` (schema), `AppUser`, `CompanyRegisterRequest` (still used by registration).

---

[Dependencies]
No new runtime packages — only DI registrations, one EF migration, and one extra interface wiring in the existing service stack.

- Backend: no new NuGet packages. New scoped DI: `builder.Services.AddScoped<ITalentPoolService, TalentPoolService>();` in `Program.cs`. `PostService` gains `IRoleSkillRepository` (already registered).
- Frontend: no new npm packages; reuse `lucide-react` icons and existing Vitest/Testing Library setup.
- Database: one EF Core migration `AddEmployerSkillsScheduleAndCompanyProfile` covering `PostSkill`, `Post.ScheduleWork`, `Company` profile columns; apply via `dotnet ef database update` (or the deploy pipeline). PostgreSQL/Npgsql provider (existing).

---

[Testing]
Add unit tests for post-skill persistence (+ `RoleSkill` upsert), candidate search, forecast extension, and company profile, extend existing stats/dashboard tests, and run both suites with the existing thresholds (`vite.config.js`: statements 50, branches 45, functions 40, lines 50).

**New backend tests**
- `CebuUpskilling.Backend.Tests/PostSkillServiceTests.cs` — using `TestDbContextFactory` (in-memory): `CreateAsync` persists `PostSkill` rows + upserts `RoleSkill`; `UpdateAsync` replaces the skill set; invalid level (6/−1) rejected; missing `SkillId` → clean error; `GetByIdAsync`/`SearchAsync` return `PostSkillDto` with skill names; `ScheduleWork` round-trips.
- `CebuUpskilling.Backend.Tests/TalentPoolServiceTests.cs` — seed learners w/ `LearnerSkill`s: filter by `SkillName`, `VerifiedOnly`, `MinSkillLevel`, `TargetRole`, `Search`; `AvgSkillLevel`/`VerifiedSkills` computed; pagination + sort whitelist; `GetCandidateDetailAsync` returns ordered skills; unknown learner → null.
- `CebuUpskilling.Backend.Tests/CompanyProfileTests.cs` — `GET/PUT api/companies/mine` updates fields, rejects invalid `Size`, 400 when recruiter has no company.
- `CebuUpskilling.Backend.Tests/StatsServiceTests.cs` — extend: given 1 company post with 2 `PostSkill`s and 3 learners (2 with that skill), assert `CompanySkillDemand` rows (PostingsRequiring, LearnersWithSkill) and `TalentForecast` (DemandRoles from `RoleSkill`, SupplyLearners, `SkillGap = max(0, demand − supply)`), plus per-post funnel counts after creating applications in each status.

**New/extended frontend tests**
- `RequiredSkillsPicker.test.jsx` — renders loaded skills, toggles selection, sets level, emits `[{skillId, skillLevel}]`.
- `TalentSearchPage.test.jsx` — mock `api.get('/talent/candidates')`; renders rows; empty state; search triggers refetch.
- `BusinessDashboardPage.test.jsx` — expects forecast table + funnel counts; delete button calls `DELETE /posts/{id}` (bug fix assertion).
- `JobPostForm.test.jsx` — include `skills` + `scheduleWork` in submitted payload; seeds from `initial`.

**Validation strategy (run before hand-off)**
1. `dotnet build` (repo root or backend dir) — zero errors.
2. `dotnet test` (backend) — all new + existing tests green.
3. `npm run test:coverage` (frontend) — pass thresholds.
4. `npx oxlint` (frontend) — no new violations.
5. Manual e2e: register company → post job w/ 2 skills + schedule → learner applies → verify job detail badges, applicant inbox, `/talent` search finds the learner, dashboard forecast shows the skill gap.

---

[Implementation Order]

Implement strictly in this order (each phase compiles and tests before the next). This is the TODO checklist for the implementation task — check items off as they complete.

**Phase 0 — Foundation & reversal check**
- [ ] Verify no leftover `PostSkill.cs` exists in `Entities/` (was reverted) and `ApplicationDbContext.cs` is back to original state
- [ ] `git status` — confirm repo clean of accidental changes (only `implementation_plan.md` should be new)

**Phase 1 — Data model**
- [ ] Create `Entities/PostSkill.cs` (Types above)
- [ ] Modify `Entities/Post.cs`: + `ScheduleWork` (`[MaxLength(200)]`), + `ICollection<PostSkill> PostSkills`
- [ ] Modify `Entities/Skill.cs`: + `ICollection<PostSkill> PostSkills`
- [ ] Modify `Entities/Company.cs`: + Description/Industry/Website/Size/LogoUrl
- [ ] Modify `Data/ApplicationDbContext.cs`: + `DbSet<PostSkill>`, + `OnModelCreating` mapping (unique `(PostId, SkillId)`, FKs cascade)
- [ ] Run `dotnet ef migrations add AddEmployerSkillsScheduleAndCompanyProfile` in `CebuUpskilling.Backend` (install `dotnet-ef` tool if missing); review generated migration
- [ ] (Optional, local/dev) `dotnet ef database update`
- [ ] `dotnet build` — green

**Phase 2 — Employer-declared skills & schedule on job posts**
- [ ] Modify `DTOs/PostDTOs.cs`: + `PostSkillRequest`, + `PostSkillDto`; + `PostRequest.Skills`/`ScheduleWork`; + `PostResponse.Skills`/`ScheduleWork`; + `PostQueryParams.CompanySize`
- [ ] Modify `Repositories/PostRepository.cs`: skill includes in `GetAllAsync`/`GetByIdAsync`/`SearchAsync`; `CompanySize` filter in `SearchAsync`
- [ ] Modify `Services/EntityServices.cs` (`PostService`): + `IRoleSkillRepository` ctor dep; persist/replace `PostSkill` rows in `CreateAsync(PostRequest,…)`/`UpdateAsync`; `RoleSkill` upsert (max-level merge); map skills + `ScheduleWork` in `ToResponse`; validate levels + duplicate SkillIds (400)
- [ ] Verify `Controllers/PostsController.cs` needs no change (request flows through) — adjust if round-trip test fails
- [ ] Tests: `PostSkillServiceTests.cs` (above) — `dotnet test` green
- [ ] Frontend: `Components/jobs/RequiredSkillsPicker.jsx` (loads `GET /api/talent/skills` — endpoint lands in Phase 3; picker can be built against a temporary/loose contract, wire after Phase 3)
- [ ] Frontend: `JobPostForm.jsx` + `ScheduleWork` input; include `skills`/`scheduleWork` in payload; seed from `initial`
- [ ] Frontend: `JobDetailPage.jsx` — render skill badges + schedule
- [ ] Frontend tests: `JobPostForm.test.jsx`, `RequiredSkillsPicker.test.jsx` (pending Phase 3 endpoint mock)

**Phase 3 — Recruiter talent-pool search**
- [ ] Create `DTOs/TalentDTOs.cs` (Types above)
- [ ] Create `Services/TalentPoolService.cs` + `ITalentPoolService` (candidate search, detail, `GetSkillOptionsAsync`) — this also backs the Phase 2 picker
- [ ] Create `Controllers/TalentPoolController.cs` (`/api/talent/candidates`, `/api/talent/candidates/{learnerId}`, `/api/talent/skills`; `[Authorize(Roles="Recruiter")]`)
- [ ] Register `ITalentPoolService` in `Program.cs`
- [ ] Tests: `TalentPoolServiceTests.cs` — `dotnet test` green
- [ ] Frontend: `TalentSearchPage.jsx` + route `/talent` in `App.jsx` (inside `RecruiterRoute`) + `Sidebar` "Talent pool" nav
- [ ] Wire `RequiredSkillsPicker` to real `GET /api/talent/skills`
- [ ] Frontend tests: `TalentSearchPage.test.jsx`, finish `RequiredSkillsPicker.test.jsx`

**Phase 4 — Talent forecasting + business dashboard**
- [ ] Modify `DTOs/BusinessStatsDTOs.cs`: + `CompanySkillDemandDto`, + `TalentForecastDto`; + funnel fields on `JobPostingDto`; + `CompanySkillDemand`/`TalentForecast` on `BusinessStatsResponse`
- [ ] Modify `Services/StatsService.cs`: + `GetBusinessStatsAsync(int companyId)` (funnel counts, CompanySkillDemand, TalentForecast, global SkillDemand preserved)
- [ ] Modify `Controllers/StatsController.cs`: delegate `GetBusinessStats()` to service
- [ ] Tests: extend `StatsServiceTests.cs` — `dotnet test` green
- [ ] Frontend: `BusinessDashboardPage.jsx` — add `CompanySkillDemand` table, `TalentForecast` gap list, per-posting funnel counts; fix delete-URL double-prefix bug
- [ ] Frontend tests: extend `BusinessDashboardPage.test.jsx`

**Phase 5 — Company profile (SME identity)**
- [ ] Create `DTOs/CompanyDTOs.cs` (`CompanyProfileRequest`/`CompanyProfileResponse`)
- [ ] Modify `Controllers/CompaniesController.cs`: + `GET/PUT api/companies/mine` (Recruiter), validate `Size` whitelist
- [ ] Tests: `CompanyProfileTests.cs` — `dotnet test` green
- [ ] Frontend: `CompanyProfilePage.jsx` + route `/company-profile` (RecruiterRoute) + `Sidebar` "Company profile" nav; optional `CompanySize` filter chip on `JobsPage`

**Phase 6 — Full verification**
- [ ] `dotnet build` + `dotnet test` (all backend suites)
- [ ] `npm run test:coverage` + `npx oxlint` (frontend)
- [ ] Manual e2e (per Testing section): company register → post job w/ skills+schedule → learner applies → inbox → `/talent` search → dashboard forecast
- [ ] Update `implementation_plan.md` checkboxes to reflect completion

**Deferred / follow-ups (documented, NOT in this pass):** admin company approval, recruiter team management UI, in-app notification feed, numeric `MinSalary/MaxSalary` parsing + salary filter, employer-side application filtering by status/post/date, interview scheduling, CSV/PDF report exports for DOLE/TESDA/LGU stakeholders.