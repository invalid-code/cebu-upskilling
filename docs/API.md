# API Reference

Base path: `/api`. JSON responses. Health at `GET /health`. OpenAPI (Development only) at `/openapi/v1.json`.

Related: [Backend README](../CebuUpskilling.Backend/README.md) · [Architecture](ARCHITECTURE.md) · [Root README](../README.md)

## Auth

All endpoints require `Authorization: Bearer <JWT>` unless marked **public**.
JWT: HMAC-SHA256, 15-min access expiry (`Jwt:AccessMinutes`), 30-day rotating refresh tokens (`Jwt:RefreshDays`, SHA-256 hash stored, reuse revokes all sessions). JTI revocation on logout (8-day TTL, single-instance in-memory store).
Rate limiting: global 120 req/60s per IP; auth group 10 req/60s per IP.

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| POST | `/api/auth/register` | public | Learner multipart (`resumeFile` PDF/DOCX) or JSON (non-learner). Self-service `Recruiter` rejected → use `register-company` |
| POST | `/api/auth/register-company` | public | Creates company + recruiter transactionally |
| POST | `/api/auth/login` | public | `{ emailAddress, password }` |
| POST | `/api/auth/google` | public | `{ idToken, role? }` — new accounts provisioned (Learner creates profile) |
| GET | `/api/auth/profile` | auth | Returns profile (+ fresh token) |
| PATCH | `/api/auth/profile` | auth | Update profile |
| POST | `/api/auth/logout` | auth | Revokes current JTI (+ `{ refreshToken }` in body revokes that session too) |
| POST | `/api/auth/refresh` | public | `{ refreshToken }` → rotates to a new access + refresh pair; reuse of a rotated token revokes all user sessions |
| POST | `/api/auth/confirm-email` | public | `{ email, token }` (24h token) |
| POST | `/api/auth/resend-confirmation` | public | `{ email }` — always 200 (no account enumeration) |
| POST | `/api/auth/forgot-password` | public | `{ email }` — always 200 |
| POST | `/api/auth/reset-password` | public | `{ email, token, newPassword }` (30-min token) |

## Endpoints

| Group | Base | Key endpoints | Roles |
|-------|------|---------------|-------|
| Posts (Jobs) | `/api/posts` | `GET ?search&targetRole&jobType&location&isRemote&sortBy&page&pageSize` (paged `{ items, total, page, pageSize }`), `GET {id}`, `POST`, `PUT {id}`, `DELETE {id}` (ownership-checked: foreign-company → 404) | read: auth; write: Recruiter |
| SkillGaps | `/api/skillgaps` | `GET /`, `GET /groups` (computed by `SkillGapService`) | Learner |
| Assessments | `/api/assessments` | `GET results/available/recommended`, `POST start`, `GET {id}/questions`, `POST {id}/submit`, `POST {id}/integrity-event`, `POST company/questions` (Recruiter), `POST provider/questions` (CourseProvider). Inherited generic CRUD returns 404 | mixed |
| Applications | `/api/applications` | `GET /`, `POST /` (idempotent: repeat apply → `AlreadyApplied`), `PATCH {postId}`, `GET/PATCH employer/…` | learner + Recruiter (employer) |
| Courses (catalogue) | `/api/courses` | `GET /` (Published only, internal fields stripped), `GET {id}` (Published only), `GET {id}/detail`. Generic create/update/delete return 404 — writes go through `/api/company/courses` | auth |
| Courses page | `/api/coursespage` | `GET ?category` (enrolled + recommended) | auth |
| Enrollments | `/api/enrollments` | `GET /`, `POST /` (repeat → `Already enrolled`). `GET {id}`/PUT/DELETE return 404 (composite key) | Learner |
| CourseContent | `/api/coursecontent` | `GET courses/{id}/content`, `GET lessons/{id}`, `PUT lessons/{id}/progress` | auth (enrollment-checked) |
| Notes | `/api/notes` | `GET courses/{id}`, `GET/PUT/DELETE lessons/{id}` | Learner |
| Discussions | `/api/discussions` | `GET lessons/{id}`, `POST lessons/{id}/posts` | Learner |
| Media | `/api/media` | `POST lessons/{id}/video` (500MB, R2), `POST documents`, `POST lessons/{id}/documents` (10MB, magic-byte checked) | auth |
| Stats | `/api/stats` | `GET week` (Learner), `GET business` (Recruiter, company-scoped + global demand) | role |
| Companies | `/api/companies` | Generic CRUD (public reads for catalogue) | mixed |
| Learners | `/api/learners` | `GET ?page&pageSize` (max 100; name/role projection only — no emails) | Learner |
| Skills | `/api/skills` | `GET /` (mine), `GET /list`, `POST /parse` | auth |
| CourseManagement | `/api/company/courses` | `GET /`, `GET {id}`, `POST /`, `PUT {id}`, `POST {id}/publish`, `DELETE {id}` (409 when learners enrolled) | Recruiter, CourseProvider |
| CourseGeneration | `/api/company/courses/generate` | AI-assisted draft generation | Recruiter, CourseProvider |
| HiringAgent | `/api/hiring-agent` | Candidate ranking (AI with fallbacks) | Recruiter |
| MarketTrends | `/api/market-trends` | Skill/role demand snapshots | auth |
| LearningPathways | `/api/pathways` | Ordered gap × demand pathway with courses | Learner |

## Errors & status codes

Errors are `{ "error": "…" }` via `GlobalExceptionHandler`:

| Code | Meaning |
|------|---------|
| 400 | Validation / business-rule failure (`InvalidOperationException`) |
| 401 | Missing/invalid/expired/revoked token; malformed user claim |
| 403 | Authenticated but wrong role / no company |
| 404 | Not found — also used to hide foreign-company resources and disabled generic endpoints |
| 409 | Conflict — e.g. deleting a course with enrolled learners |
| 413 | File too large |
| 429 | Rate limit exceeded (per-IP windows above) |
| 500/502/503 | Unexpected / AI upstream failure / storage unavailable (sanitized, no secret leakage) |

## Clients

- **Web SPA** (`frontend/src/api/client.js`) uses `XMLHttpRequest` deliberately — a browser extension patches `window.fetch`. Do not switch to `fetch`.
- **Mobile** (`mobile/App.js`) uses `fetch` (no extension in React Native) with 30s timeout, `err.status`, and 401 → sign-out.
