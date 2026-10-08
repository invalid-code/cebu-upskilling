# Architecture

Career-pathway platform: ASP.NET Core 10 API + PostgreSQL 16 + React 19/Vite SPA + Expo mobile.

Related: [API Reference](API.md) · [Backend README](../CebuUpskilling.Backend/README.md) · [Root README](../README.md)

## Topology

```
React SPA :5173 --XHR--> ASP.NET Core API :5000/:5179 (dev), :8080 (docker/prod)
Expo mobile   --fetch--> Controllers (22) --> Services --> Repositories --> EF Core --> PostgreSQL 16
                                                        --> R2/S3 (media) | Gemini (AI) | Resend (email)
```

Vite proxies `/api` → `http://localhost:5000` (override with `VITE_API_URL`).
Mobile base URL via `EXPO_PUBLIC_API_URL` (default `http://localhost:5000/api`).

## Request pipeline (`Program.cs`)

```
ForwardedHeaders -> SecurityHeaders -> ExceptionHandler -> CORS -> StaticFiles
  -> RateLimiter -> Authentication (JWT) -> RevokedToken -> Authorization
  -> DuplicateRequestCache -> Controllers
```

- **ForwardedHeaders** honors `X-Forwarded-For/Proto` only from `ForwardedHeaders:KnownProxies/KnownNetworks` (loopback by default). Must stay first so rate limiting sees the real IP and spoofed headers are ignored.
- **SecurityHeaders** (`Middleware/SecurityHeadersMiddleware.cs`): nosniff, `DENY` framing, no-referrer, `default-src 'self'`, no camera/mic/geolocation; HSTS on HTTPS.
- **ExceptionHandler** (`Handlers/GlobalExceptionHandler.cs`): `KeyNotFound→404`, `UnauthorizedAccessException→401`, `InvalidOperationException→400`, S3→503 sanitized, else `500 {error}`.
- **CORS**: explicit origins, methods `GET,POST,PUT,PATCH,DELETE`, headers `Authorization, Content-Type`, no credentials/wildcards, 1h preflight cache.
- **RateLimiter** (`Options/RateLimitingOptions.cs`): per-IP fixed windows — global 120/60s, auth group 10/60s, queue 0 → `429`.
- **Auth**: JWT HMAC-SHA256 (fail-fast when `Jwt:Key` missing/short), 7-day expiry, claims `NameIdentifier/Email/Name/Role/JTI`.
- **RevokedToken** (`Middleware/RevokedTokenMiddleware.cs`): rejects logged-out JTIs (`ITokenRevocationStore`, in-memory 8-day TTL — single instance; needs Redis/DB for multi-instance prod).
- **DuplicateRequestCache** (`Middleware/DuplicateRequestCacheMiddleware.cs`): short-lived (15s default) per-user `IMemoryCache` for identical `GET /api/*` JSON responses (`X-Cache: HIT/MISS`); writes evict the caller's entries.
- **ServiceCache** (`Services/ServiceCacheKeys.cs`, `Options/ServiceCacheOptions.cs`): `IMemoryCache` inside services — market trends (4h, generation-bumped on refresh), per-user gaps/pathway/courses-page (2min), weekly stats (5min), Gemini resume-parse/course-outline by input hash (24h; failures and empty AI results never cached). Nulls (missing learner/role) are never cached.

## Domain model (26 entities)

- **Identity**: `AppUser` (unique email) 1—1 `Learner`; `AppUser` → `Company` (recruiters). Roles: `Learner` / `Recruiter` / `CourseProvider`.
- **Catalog**: `Discipline` → `SubDiscipline` → `Genre` → `Course` (`Status` Draft/Published, optional `CompanyId`) → `CourseModule` → `Lesson` → `LessonContent`/`Media`/`Exercise`. `CourseSkill` tags courses.
- **Jobs**: `Company` → `Post` (+ `PostSkill`, `PostCourseRequired` composite keys). `SkillMarketTrend` (PK `SkillId`), `RoleMarketTrend` (PK `TargetRole`) recomputed on post CUD.
- **Learner state**: `LearnerSkill` (unique learner+skill), `LearnerAssessment` (indexed learner+skill; `QuestionIdsJson` snapshot pins grading to served questions), `LearnerStudyCourse` (composite PK learner+course), `LearnerNote`, `DiscussionPost`.
- **Applications**: `Application` (unique learner+post — concurrent double-apply returns `AlreadyApplied`).
- Key uniqueness: `AppUser.EmailAddress`, `Company.Name`, `Skill.Name`, `Application(LearnerId,PostId)`, `LearnerSkill(LearnerId,SkillId)`.

## Services

| Service | Responsibility |
|---------|---------------|
| `AuthService` (+ `JwtTokenService`) | Register (transactional user+learner), company register, login, Google provisioning, email confirm/reset, profile; best-effort emails |
| `JobseekerSkillParserAgent` | Resume → Gemini skill parse → skill upsert (unique-index race-safe) → `LearnerSkill` + assessment stubs; full assessment lifecycle |
| `GoogleAiService` | Gemini HTTP client; all failures → `null`, callers degrade (empty skills, fallback scores, 502/503) |
| `SkillGapService` | Gap groups per applied role (fallback `TargetRole`) with match % |
| `ApplicationsService` / `EnrollmentsService` | Idempotent apply/enroll (unique-violation → existing outcome) |
| `CoursesPageService` / `CourseContentService` | Catalogue page, lesson content, monotonic progress |
| `LearningPathwayAgent` | Gap × market-demand ordered pathway with courses |
| `NotesService` / `DiscussionService` / `StatsService` | Notes (multi-per-lesson), discussions, weekly/business stats |
| `MediaService` / `R2StorageService` | Magic-byte-checked uploads; unconfigured R2 → sanitized error |
| `JobMarketTrendService` | Demand snapshots refreshed on post CUD |
| `SkillsSeedService` | Background skill-catalog fill (static catalog or `SkillsSeed:SourceUrl`) |

## Deliberate security decisions (do not "fix")

- `BaseEntityController<T>` generic CRUD is **overridden to 404** on Auth/Assessments/Courses/Enrollments — the generic surface would allow mass disclosure and `Verified`/`ScoredLevel`/`CompanyId` forgery.
- `CoursesController` reads are Published-only safe copies; writes live in `CourseManagementController` (company-scoped). Course delete is **blocked (409)** while learners are enrolled.
- Controllers resolve the user id via `ClaimsPrincipalExtensions.TryGetUserId` — malformed claims → 401, never 500.
- Posts return **404 (not 403)** for foreign-company access to avoid org enumeration.
- Claim-parsing, transactionality (`RegisterAsync`, `CompanyRegisterAsync`), and idempotent apply/enroll are covered by regression tests — keep them green.

## Tests

- Backend: xUnit + `ProductionApiFactory` (isolated EF InMemory, faked R2/Gemini). No Postgres needed for tests.
- Frontend: vitest (70 files) + Playwright (chromium). Lint: oxlint.
- Mobile: no harness yet — first tests should cover `request()` unwrap/401, login trim, `CompanyLogo` initials.
