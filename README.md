# Cebu Upskilling

Career pathway platform connecting learners and employers in Cebu — skill-gap analysis, AI-assisted assessments, course enrollment, and job applications.

> **Stack:** ASP.NET Core 10 + PostgreSQL 16 + React 19 / Vite 6 + Expo 54 + Gemini + Cloudflare R2 + Resend

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Overview](#api-overview)
- [Database & Migrations](#database--migrations)
- [Testing](#testing)
- [Linting & Formatting](#linting--formatting)
- [Mobile App](#mobile-app)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Documentation Index](#documentation-index)

---

## Features

**Learner**
- Register with resume upload — `JobseekerSkillParserAgent` calls Gemini to extract skills, creates unverified `LearnerSkill` + `LearnerAssessment` stubs automatically.
- Set `TargetRole` → `SkillGapService` computes gap groups per applied role (or fallback `TargetRole`), with match % and gap-sorted `RoleSkill` vs `LearnerSkill`.
- Enroll in courses (`LearnerStudyCourse`), track lesson progress, take notes (`LearnerNote`) and participate in lesson discussions (`DiscussionPost`).
- Take AI-generated or company-sourced assessments (5 random questions, 45-min window, level 1–5 scoring at 30/50/70/90% thresholds).

**Recruiter / Company**
- Register a company and recruiter account transactionally.
- Post jobs (`Post`) with required courses, manage applications, create company assessment questions per skill.
- View business stats: company summary, talent pool, skill demand/supply, job posting counts.

**Platform**
- JWT auth (HMAC-SHA256, 7-day expiry, JTI revocation), role-based authorization (`Learner` / `Recruiter`), rate-limiting (global 120/60s, auth 10/60s), health check, Serilog logging.

---

## Architecture

```
┌────────────────────┐        ┌──────────────────────────┐
│  React SPA :5173   │──XHR──▶│  ASP.NET Core API        │
│  Vite + React Router 7     │  :5000 / :5179 (dev)     │
│  contexts, lucide  │◀──────│  :8080 (docker/prod)     │
└─────────┬──────────┘   JWT  │  Controllers (17)        │
          │                   │  Services (Agent, Gap,   │
          │                   │   Auth, Enroll, Stats…)  │
          │                   │  EF Core → PostgreSQL    │
┌─────────▼──────────┐        │  R2/S3 · Gemini · Resend │
│  Expo Mobile       │─fetch─▶│  Serilog · RateLimit     │
│  SecureStore JWT   │  JWT   │  HealthChecks · CORS     │
│  5 bottom tabs     │        └──────┬──────┬──────┬─────┘
└────────────────────┘               │      │      │
                                     ▼      ▼      ▼
                                PostgreSQL  R2    Gemini API
                                5432 pgdata Bucket generative-language
```

**Request flow:** `Browser/Mobile → CORS → SecurityHeaders → ExceptionHandler → RateLimiter (IP via X-Forwarded-For) → Authentication (JWT) → RevokedTokenMiddleware → Authorization (role) → Controller → Service → Repository → ApplicationDbContext → PostgreSQL`. File uploads go through `MediaController → R2StorageService → Media` record (+ `wwwroot/uploads/documents` for documents).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for entity-relationship details, middleware pipeline, and service responsibilities.

---

## Project Structure

```
.
├── CebuUpskilling.Backend/       # ASP.NET Core 10 Web API
│   ├── Controllers/              # 17 controllers (Auth, Posts, Assessments, …)
│   ├── Services/                 # Business logic (AuthService, JobseekerSkillParserAgent, …)
│   ├── Repositories/             # Generic + specialized repositories
│   ├── Entities/                 # 26 entities (AppUser, Learner, Course, Skill, …)
│   ├── Data/ApplicationDbContext.cs
│   ├── DTOs/                     # Request/response records
│   ├── Validators/               # FluentValidation validators
│   ├── Middleware/               # SecurityHeaders, RevokedToken
│   ├── Handlers/GlobalExceptionHandler.cs
│   ├── Options/                  # R2, GoogleAi, Email, RateLimiting
│   ├── Migrations/               # 28 EF Core migrations
│   ├── Properties/launchSettings.json
│   ├── appsettings.json / appsettings.Development.json
│   ├── Dockerfile
│   └── README.md
├── CebuUpskilling.Backend.Tests/ # xUnit tests (Auth, Assessment, SkillGap, …)
├── frontend/                     # React 19 + Vite 6 SPA
│   ├── src/
│   │   ├── api/client.js         # XHR client (avoids fetch patch)
│   │   ├── lib/jwt.js
│   │   ├── context/              # Auth, Enrollments, Applications, Toast
│   │   ├── components/           # Layout, RoleRoute, jobs, shared (15), ui (9)
│   │   ├── pages/                # 21 pages (Overview, Skills, Jobs, …)
│   │   ├── utils/                # resumeText (pdfjs+mammoth), validation
│   │   ├── App.jsx               # Router + provider nesting
│   │   └── main.jsx / index.css
│   ├── e2e/                      # Playwright specs
│   ├── vite.config.js / playwright.config.js
│   ├── .env.example / .env.development
│   └── README.md
├── mobile/                       # Expo 54 / React Native 0.81
│   ├── App.js                    # Single-file app: AuthContext + 5 tabs
│   ├── app.json
│   ├── logger.js
│   └── README.md
├── scripts/                      # Reserved for automation (currently empty)
├── docker-compose.yml            # db (postgres:16) + api
├── CebuUpskilling.sln
├── CebuUpskillingDocumentation.pdf # 13-page product spec (PDF 1.7)
├── global.json                   # .NET SDK 10.0.302
├── .nvmrc                        # Node 26
└── README.md                     # This file
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| .NET SDK | 10.0.302 (see [global.json](global.json)) | `rollForward: latestFeature` |
| Node.js | 26 (see [.nvmrc](.nvmrc)) | Use `nvm use` |
| PostgreSQL | 16 | Or `docker compose up db` |
| Docker / Compose | any recent | For containerized run |
| Expo CLI | bundled via `npx expo` | For mobile; optional simulators |

---

## Quick Start

### 1. Clone & check versions

```bash
git clone <repo-url> cebu-upskilling && cd cebu-upskilling
dotnet --version   # should satisfy 10.0.302
nvm use            # 26
```

### 2. Configure secrets (required)

The API refuses to start without `Jwt:Key` (≥32 chars). Provide it via user-secrets (local) or environment (Docker/prod). See [Configuration](#configuration) for the full set.

```bash
dotnet user-secrets set "Jwt:Key" "replace-with-32-char-minimum-secret-key" \
  --project CebuUpskilling.Backend

# optional overrides
dotnet user-secrets set "Jwt:Issuer" "cebu-upskilling" --project CebuUpskilling.Backend
dotnet user-secrets set "Jwt:Audience" "cebu-upskilling-frontend" --project CebuUpskilling.Backend
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Host=localhost;Port=5432;Database=cebuupskilling;Username=postgres;Password=postgres" \
  --project CebuUpskilling.Backend
```

For R2 / Gemini / Email you can also use user-secrets (`R2:AccountId`, `GoogleAi:ApiKey`, etc.) — without them the features degrade gracefully (R2 disabled, Gemini returns empty skills, email falls back to `LoggingEmailService`).

### 3. Start PostgreSQL

```bash
# via Compose (recommended)
docker compose up db -d
# or use a local Postgres 16 instance
```

### 4. Apply migrations & run the API

```bash
dotnet ef database update --project CebuUpskilling.Backend
dotnet run --project CebuUpskilling.Backend --launch-profile http
# API on http://localhost:5000 and http://localhost:5179 (see Properties/launchSettings.json)
# Health: http://localhost:5000/health  (also /health in Docker at :8080)
# OpenAPI (dev only): http://localhost:5000/openapi/v1.json
```

Or containerized:

```bash
# Requires Jwt__Key env (see docker-compose.yml)
Jwt__Key="replace-with-32-char-minimum-secret-key" docker compose up --build
# db :5432, api :8080, health http://localhost:8080/health
```

### 5. Run the frontend

```bash
cd frontend
npm ci
npm run dev -- --port 5173 --host 127.0.0.1
# SPA on http://localhost:5173
# Vite proxies /api → http://localhost:5000 (vite.config.js)
# Override with VITE_API_URL (see frontend/.env.example)
```

Environment examples:

```bash
# frontend/.env.development (dev server)
VITE_API_URL=http://localhost:5179/api

# production / Vercel
VITE_API_URL=https://your-api.example.com/api
```

### 6. Run the mobile app (optional)

```bash
cd mobile
npm ci
npx expo start          # choose iOS / Android / web
# API URL via EXPO_PUBLIC_API_URL (default http://localhost:5000/api)
EXPO_PUBLIC_API_URL=http://localhost:5000/api npx expo start
```

---

## Configuration

All backend options bind from `appsettings.json` → `appsettings.Development.json` → user-secrets → environment variables. Environment uses `__` as section separator (e.g., `Jwt__Key` → `Jwt:Key`).

| Option | Env var | Default | Required |
|--------|---------|---------|----------|
| **Connection string** | `ConnectionStrings__DefaultConnection` | `""` (set via secrets) | yes for DB |
| **JWT key** | `Jwt__Key` | `""` | **yes** (≥32 chars) |
| **JWT issuer/audience** | `Jwt__Issuer` / `Jwt__Audience` | `cebu-upskilling` / `cebu-upskilling-frontend` | — |
| **CORS origins** | `Cors__AllowedOrigins` / `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | — |
| **R2 Account** | `R2__AccountId` | `""` | for media upload |
| **R2 Access key** | `R2__AccessKeyId` | `""` | — |
| **R2 Secret** | `R2__SecretAccessKey` | `""` | — |
| **R2 Bucket** | `R2__BucketName` | `""` | — |
| **R2 Public URL** | `R2__PublicBaseUrl` | `""` | — |
| **Gemini API key** | `GoogleAi__ApiKey` | `""` | for skill parsing / question gen |
| **Gemini model** | `GoogleAi__Model` | `gemini-3-flash-preview` (appsettings) / `gemini-2.5-flash` (compose) | — |
| **Gemini base URL** | `GoogleAi__BaseUrl` | `https://generativelanguage.googleapis.com/v1beta` | — |
| **Resend API key** | `Email__ApiKey` | `""` | if empty → log-only email |
| **Email from** | `Email__From` | `onboarding@resend.dev` | — |
| **Email base URL** | `Email__BaseUrl` | `https://api.resend.com` | — |
| **Rate limiting** | `RateLimiting__Enabled` | `true` | — |
| **Global limit** | `RateLimiting__Global__PermitLimit` / `WindowSeconds` | `120` / `60` | — |
| **Auth limit** | `RateLimiting__Auth__PermitLimit` / `WindowSeconds` | `10` / `60` | — |
| **Postgres (compose)** | `POSTGRES_USER/PASSWORD/DB` | `postgres/postgres/cebuupskilling` | compose only |
| **Frontend API** | `VITE_API_URL` | `/api` (proxy) / `http://localhost:5179/api` (dev) | — |
| **Mobile API** | `EXPO_PUBLIC_API_URL` | `http://localhost:5000/api` | — |

Security notes: CORS allows only `GET,POST,PUT,PATCH,DELETE` with headers `Authorization, Content-Type`, no credentials/wildcards, preflight cache 1h. JWT key must be ≥32 chars (HMAC-SHA256). Sensitive values are never committed — see [CebuUpskilling.Backend/README.md](CebuUpskilling.Backend/README.md).

---

## API Overview

Base path ` /api`. Interactive spec available in Development at `/openapi/v1.json` (`MapOpenApi`). Health at `/health`.

Detailed table with auth requirements, DTOs, and status codes: **[docs/API.md](docs/API.md)**.

| Group | Base | Notable endpoints |
|-------|------|-------------------|
| **Auth** | `/api/auth` | `POST register`, `POST register-company`, `POST login`, `PATCH profile`, `POST logout`, `POST confirm-email`, `POST forgot-password`, `POST reset-password` |
| **Posts (Jobs)** | `/api/posts` | `GET ?search&targetRole&jobType&…`, `GET {id}`, `POST` (Recruiter), `PUT {id}`, `DELETE {id}` |
| **SkillGaps** | `/api/skillgaps` | `GET /` + `GET /groups` (Learner) — computed by `SkillGapService` |
| **Assessments** | `/api/assessments` | `GET results/available/recommended`, `POST start`, `GET {id}/questions`, `POST {id}/submit`, `POST company/questions` (Recruiter) |
| **Applications** | `/api/applications` | `GET /`, `POST /`, `PATCH {postId}`, `GET/ PATCH employer/{…}` (Recruiter) |
| **Courses** | `/api/courses` | Generic `BaseEntityController<Course>` + `GET {id}/detail` |
| **Enrollments** | `/api/enrollments` | `GET /`, `POST /` (Learner) |
| **CourseContent** | `/api/coursecontent` | `GET courses/{id}/content`, `GET lessons/{id}`, `PUT lessons/{id}/progress` |
| **Notes** | `/api/notes` | `GET courses/{id}`, `GET/PUT/DELETE lessons/{id}` |
| **Discussions** | `/api/discussions` | `GET lessons/{id}`, `POST lessons/{id}/posts` |
| **Media** | `/api/media` | `POST lessons/{id}/video` (R2), `POST documents` |
| **Stats** | `/api/stats` | `GET week` (Learner), `GET business` (Recruiter) |
| **Companies/Learners/Skills** | `/api/companies` etc. | Generic CRUD via `BaseEntityController` |

Auth: `Authorization: Bearer <JWT>` except `AllowAnonymous` endpoints (login/register/email flows). Responses are JSON; errors are `{"error":"…"}` with appropriate status (400/401/404/429/500) via `GlobalExceptionHandler` and rate-limiter.

---

## Database & Migrations

- Provider: **PostgreSQL 16** (`Npgsql.EntityFrameworkCore.PostgreSQL`).
- 28 migrations from `20260804104054_InitialCreate` through `20260820170749_AddDiscussionPosts` — see `CebuUpskilling.Backend/Migrations/` and `ApplicationDbContextModelSnapshot.cs`.
- Key constraints: `AppUser.EmailAddress` unique, `LearnerSkill (LearnerId, SkillId)` unique, `LearnerStudyCourse (LearnerId, CourseId)` composite PK, `PostCourseRequired (PostId, CourseId)` composite PK, timestamps `timestamp with time zone`.

```bash
# Create a new migration
dotnet ef migrations add MyMigration --project CebuUpskilling.Backend

# Apply / revert
dotnet ef database update --project CebuUpskilling.Backend
dotnet ef database update <PreviousMigration> --project CebuUpskilling.Backend
```

Seed data is handled through migrations (no standalone `SeedData` folder).

---

## Testing

### Backend

```bash
dotnet test CebuUpskilling.Backend.Tests/CebuUpskilling.Backend.Tests.csproj
# with coverage (Coverlet)
dotnet test --collect:"XPlat Code Coverage" --settings coverlet.runsettings
```

Suites: `AuthServiceTests`, `AssessmentServiceTests`, `SkillGapServiceTests`, `ApplicationsServiceTests`, validator tests, integration `AuthApiTests` (uses `TestDbContextFactory`).

### Frontend

```bash
cd frontend
npm test                # vitest run (single)
npm run test:watch      # watch mode
npm run test:e2e        # playwright (chromium, baseURL http://localhost:5173, webServer npm run dev)
npm run test:e2e:ui     # headed UI
npm run test:e2e:headed # headed browser
# coverage thresholds: statements 50, branches 45, functions 40, lines 50 (vite.config.js)
```

### Lint

```bash
cd frontend
npm run lint   # oxlint
```

---

## Mobile App

Expo 54 + React Native 0.81. Single-file [mobile/App.js](mobile/App.js) (65 lines) with `SecureStore` session persistence, `AuthContext`, and 5 bottom tabs (Home / Skills / Jobs / Learn / Account). See [mobile/README.md](mobile/README.md) for emulator setup, `EXPO_PUBLIC_API_URL`, and theming.

---

## Deployment

`docker-compose.yml` builds two services:

- `db: postgres:16-alpine` — `pgdata` volume, `5432`, healthcheck `pg_isready`.
- `api: build ./CebuUpskilling.Backend` (multi-stage `sdk→aspnet`, installs `curl`, `ASPNETCORE_HTTP_PORTS=8080`, healthcheck `curl --fail http://localhost:8080/health`) — env `ASPNETCORE_ENVIRONMENT=Production`, `ConnectionStrings__DefaultConnection Host=db`, `Jwt__*`, `R2__*`, `GoogleAi__*`, `Cors__AllowedOrigins`.

```bash
docker compose up --build -d
curl http://localhost:8080/health
docker compose logs -f api
```

Frontend is Vite-static (`npm run build` → `dist/`) — deployed to Vercel (see `.env` `CORS_ALLOWED_ORIGINS` includes `https://cebu-upskilling.vercel.app`). Backend image can be pushed to Docker Hub and deployed to Render/Railway via deploy hook.

Logs: backend writes `logs/app-*.log` (rolling daily, 30-day retention) plus console; compose mounts `api-logs:/app/logs`.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| `Jwt:Key is not configured` / `must be at least 32 characters` on startup | Set `Jwt:Key` via `dotnet user-secrets` or `Jwt__Key` env. Check `Program.cs:129-134`. |
| `401 {error: Token has been revoked}` | `RevokedTokenMiddleware` rejected a logged-out JTI (8-day TTL in `InMemoryTokenRevocationStore`). Sign in again. |
| `429 Too Many Requests` | Rate limiter — global 120/60s or auth 10/60s per IP (`X-Forwarded-For` → `RemoteIpAddress`). See `Program.cs:170-217` and `Options/RateLimitingOptions.cs`. |
| Frontend 401 redirects to `/login` immediately | `api/client.js:48-58` clears session on 401 if a token existed; `lib/jwt.js` pre-checks expiry. Re-authenticate. |
| `/api` requests hitting `localhost:5179` unexpectedly | Browser extension `injectScriptAdjust.js` patches `fetch`; the SPA uses `XMLHttpRequest` deliberately (`api/client.js:1-4`). Do not switch to `fetch`. |
| DB connection errors | Check `ConnectionStrings__DefaultConnection`, `docker compose ps`, `pg_isready`, then `dotnet ef database update`. |
| Vite proxy 404s | Dev expects API on `:5000` (`vite.config.js:9`) — ensure `dotnet run` is listening on `:5000`/`:5179`. Set `VITE_API_URL` if using another host. |
| Missing skill suggestions / questions | `GoogleAi__ApiKey` not set — parsing falls back gracefully; assessments still work with company questions. |

---

## Documentation Index

- [Backend — setup, secrets, running, configuration](CebuUpskilling.Backend/README.md)
- [Frontend — dev server, proxy, scripts, routing, testing](frontend/README.md)
- [Mobile — Expo, navigation, env, theming](mobile/README.md)
- [API Reference — endpoints, auth, DTOs, middleware](docs/API.md)
- [Architecture — domain model, ER, services, pipeline](docs/ARCHITECTURE.md)
- [Product spec — 13-page PDF](CebuUpskillingDocumentation.pdf)

---

## Contributing

Branching follows `main` with feature/fix prefixes (e.g., `feat/employer-job-specs`, `fix/update-tests`). No `CONTRIBUTING.md` yet — open issues/PRs against `main`. Secrets are managed via `.NET User Secrets` locally and environment variables in Compose/CI; never commit them. Run `dotnet test` and `npm test` before pushing.

