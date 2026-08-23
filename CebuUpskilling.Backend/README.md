# Cebu Upskilling Backend

ASP.NET Core 10 Web API for the Cebu Upskilling platform — auth, job posts, skill gaps, AI assessments, course content, media uploads, and analytics.

Related docs: [Root README](../README.md) · [API Reference](../docs/API.md) · [Architecture](../docs/ARCHITECTURE.md)

---

## Contents

- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Docker](#docker)
- [Database & Migrations](#database--migrations)
- [Project Layout](#project-layout)
- [Middleware Pipeline & Security](#middleware-pipeline--security)
- [Configuration Reference](#configuration-reference)
- [Logging & Health](#logging--health)
- [Tests](#tests)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- .NET SDK **10.0.302** (`../global.json` — `rollForward: latestFeature`)
- PostgreSQL **16** (local install or `docker compose up db`)
- Optional: Docker & Compose, Node 26 for the frontend

Check:

```bash
dotnet --version  # ≥10.0.302
psql --version
```

---

## Configuration

Sensitive settings are **never committed**. Provide them via .NET User Secrets (local dev, recommended) or environment variables (Docker / production — `docker-compose.yml` shows the mapping). The secret store ID is `cebu-upskilling-backend-local` (`CebuUpskilling.Backend.csproj`).

### Required — JWT signing key

The API refuses to start without `Jwt:Key` (≥32 chars for HMAC-SHA256, `Program.cs:129-134`):

```bash
dotnet user-secrets set "Jwt:Key" "your-32-character-minimum-secret-key-here" --project CebuUpskilling.Backend
```

Issuer / audience (defaults shown in `appsettings.json` / `appsettings.Development.json`):

```bash
dotnet user-secrets set "Jwt:Issuer" "cebu-upskilling" --project CebuUpskilling.Backend
dotnet user-secrets set "Jwt:Audience" "cebu-upskilling-frontend" --project CebuUpskilling.Backend
# Development defaults: Issuer=CebuUpskilling, Audience=CebuUpskillingClient
```

In Docker/prod set `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience` env vars instead.

### Database

```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Host=localhost;Port=5432;Database=cebuupskilling;Username=postgres;Password=postgres" \
  --project CebuUpskilling.Backend
# Or: Host=db when running via docker-compose
```

### Cloudflare R2 (object storage for lesson videos)

```bash
dotnet user-secrets set "R2:AccountId" "..." --project CebuUpskilling.Backend
dotnet user-secrets set "R2:AccessKeyId" "..." --project CebuUpskilling.Backend
dotnet user-secrets set "R2:SecretAccessKey" "..." --project CebuUpskilling.Backend
dotnet user-secrets set "R2:BucketName" "..." --project CebuUpskilling.Backend
dotnet user-secrets set "R2:PublicBaseUrl" "..." --project CebuUpskilling.Backend
# Docker env: R2__AccountId etc. (see docker-compose.yml)
# Without these, Media uploads are disabled gracefully.
```

### Gemini AI (skill parsing & question generation)

Replaces the former `OpenRouter` integration. Binds `Options/GoogleAiOptions.cs` (`GoogleAi` section):

```bash
dotnet user-secrets set "GoogleAi:ApiKey" "..." --project CebuUpskilling.Backend
dotnet user-secrets set "GoogleAi:Model" "gemini-2.5-flash" --project CebuUpskilling.Backend
dotnet user-secrets set "GoogleAi:BaseUrl" "https://generativelanguage.googleapis.com/v1beta" --project CebuUpskilling.Backend
# Docker env: GoogleAi__ApiKey, GoogleAi__Model (default gemini-2.5-flash), GoogleAi__BaseUrl
# Defaults in appsettings.json: Model=gemini-3-flash-preview
```

### Email (Resend or log-only fallback)

`Options/EmailOptions.cs` — if `Email:ApiKey` is empty, `LoggingEmailService` is used (no outbound email):

```bash
dotnet user-secrets set "Email:ApiKey" "re_..." --project CebuUpskilling.Backend
dotnet user-secrets set "Email:From" "onboarding@resend.dev" --project CebuUpskilling.Backend
# BaseUrl default https://api.resend.com
```

### CORS

```bash
dotnet user-secrets set "Cors:AllowedOrigins" "http://localhost:5173,https://cebu-upskilling.vercel.app" --project CebuUpskilling.Backend
# Docker: CORS_ALLOWED_ORIGINS env → Cors__AllowedOrigins
# Production default in compose: http://localhost:5173,https://cebu-upskilling.vercel.app
```

See [Root README → Configuration](../README.md#configuration) for the full env-var table.

---

## Running Locally

```bash
# 1. Start Postgres (choose one)
docker compose up db -d          # or: docker compose up db (foreground)
# -- or a local Postgres 16 instance with a cebuupskilling database

# 2. Apply migrations
dotnet ef database update --project CebuUpskilling.Backend

# 3. Run the API
dotnet run --project CebuUpskilling.Backend --launch-profile http
# or: dotnet run --project CebuUpskilling.Backend
```

- URLs: `http://localhost:5000` and `http://localhost:5179` (`Properties/launchSettings.json` — `applicationUrl`). `ASPNETCORE_ENVIRONMENT=Development` when using the `http` profile.
- Health: `GET /health` (`AddDbContextCheck<ApplicationDbContext>`)
- OpenAPI (dev only): `MapOpenApi()` → `/openapi/v1.json`
- CORS: default `http://localhost:5173`
- Rate limiting: per-IP via `X-Forwarded-For` fallback `RemoteIpAddress` — Global 120/60s, Auth 10/60s (`Options/RateLimitingOptions.cs`). Returns `429` when exceeded. Disable with `RateLimiting:Enabled=false`.

---

## Docker

Multi-stage build (`sdk:10.0` → `aspnet:10.0`, installs `curl`, `ASPNETCORE_HTTP_PORTS=8080`, healthcheck `curl http://localhost:8080/health`):

```bash
# Full stack
docker compose up --build

# API only (needs db)
docker compose up api --build -d && docker compose logs -f api

# Individual
docker build -f CebuUpskilling.Backend/Dockerfile -t cebu-upskilling-api .
docker run -p 8080:8080 -e Jwt__Key="..." -e ConnectionStrings__DefaultConnection="Host=host.docker.internal;..." cebu-upskilling-api
```

Compose env (see `../docker-compose.yml`): `POSTGRES_USER/PASSWORD/DB`, `ConnectionStrings__DefaultConnection` (`Host=db`), `Jwt__*`, `R2__*`, `GoogleAi__*`, `Cors__AllowedOrigins`, `ASPNETCORE_ENVIRONMENT=Production`, volumes `pgdata:/var/lib/postgresql/data`, `api-logs:/app/logs`, ports `5432:5432` (db) and `8080:8080` (api).

---

## Database & Migrations

- 28 migrations: `20260804104054_InitialCreate` → `20260820170749_AddDiscussionPosts` (`Migrations/` + `ApplicationDbContextModelSnapshot.cs`).
- Naming is timestamp-prefixed (`yyyyMMddHHmmss_Description`).
- Key constraints: see [Root README → Database](../README.md#database--migrations) and `Data/ApplicationDbContext.cs`.

```bash
dotnet ef migrations add AddMyChange --project CebuUpskilling.Backend
dotnet ef database update --project CebuUpskilling.Backend
dotnet ef database update 20260820131748_MultipleNotesPerLesson --project CebuUpskilling.Backend  # revert
dotnet ef migrations remove --project CebuUpskilling.Backend  # last only, if not applied
```

Design-time factory: `Data/DesignTimeDbContextFactory.cs` (used by `dotnet ef`).

---

## Project Layout

```
CebuUpskilling.Backend/
├── Program.cs                 # DI, middleware pipeline, startup validation
├── Controllers/               # 17 controllers (see docs/API.md)
│   ├── AuthController.cs
│   ├── PostsController.cs (api/posts)  # job posts
│   ├── AssessmentsController.cs
│   ├── SkillGapsController.cs
│   ├── ApplicationsController.cs
│   ├── CoursesController.cs / CoursesPageController.cs
│   ├── EnrollmentsController.cs
│   ├── CourseContentController.cs
│   ├── NotesController.cs
│   ├── DiscussionsController.cs
│   ├── MediaController.cs
│   ├── StatsController.cs
│   ├── SkillsController.cs / CompaniesController.cs / LearnersController.cs
│   └── BaseEntityController.cs        # generic CRUD base (Authorize by default)
├── Services/                  # business logic
│   ├── AuthService.cs         # JWT (7d, JTI, BCrypt, confirmation/reset flows)
│   ├── JobseekerSkillParserAgent.cs # unified skill parsing + assessments
│   ├── GoogleAiService.cs     # Gemini HTTP client (generateContent)
│   ├── SkillGapService.cs
│   ├── ApplicationsService.cs / EnrollmentsService.cs
│   ├── CoursesPageService.cs / CourseContentService.cs
│   ├── NotesService.cs / DiscussionService.cs / StatsService.cs
│   ├── MediaService.cs / R2StorageService.cs / IObjectStorageService.cs
│   ├── EmailService.cs / ResendEmailService.cs
│   ├── TokenRevocationStore.cs (InMemory, JTI 8-day TTL)
│   ├── AddressParser.cs / EntityServices.cs / SkillParsingService.cs (compat)
│   └── …
├── Repositories/              # IRepository<T>, EntityRepository<T> + 15 specialized
├── Entities/                  # 26 entities + AuditableEntity (see docs/ARCHITECTURE.md)
├── DTOs/                      # Auth, Post, CourseContent, Assessment, Application, …
├── Validators/                # FluentValidation (AuthValidators, RequestValidators, …)
├── Data/
│   ├── ApplicationDbContext.cs
│   └── DesignTimeDbContextFactory.cs
├── Middleware/
│   ├── SecurityHeadersMiddleware.cs
│   └── RevokedTokenMiddleware.cs
├── Handlers/GlobalExceptionHandler.cs
├── Options/                   # R2Options, GoogleAiOptions, EmailOptions, RateLimitingOptions
├── Migrations/
├── Properties/launchSettings.json
├── appsettings.json / appsettings.Development.json
├── Dockerfile / .dockerignore
└── wwwroot/                   # static + uploads/documents
```

---

## Middleware Pipeline & Security

Order in `Program.cs:226-238`:

```
SecurityHeaders → ExceptionHandler → Cors → StaticFiles → RateLimiter
  → Authentication (JwtBearer) → RevokedToken → Authorization → Controllers
```

- **SecurityHeaders** (`Middleware/SecurityHeadersMiddleware.cs`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `CSP: default-src 'self'; frame-ancestors 'none'`, `Permissions-Policy: camera=(),microphone=(),geolocation=()`, `HSTS` 1y if HTTPS.
- **ExceptionHandler** (`Handlers/GlobalExceptionHandler.cs`): `KeyNotFoundException→404`, `UnauthorizedAccessException→401`, `InvalidOperationException→400`, else 500 `{error: …}`.
- **CORS** (`Program.cs:40-71`): origins from `Cors:AllowedOrigins` (default `http://localhost:5173`), validated as absolute http/https, deduped, trimmed; methods `GET,POST,PUT,PATCH,DELETE`; headers `Authorization, Content-Type`; no credentials/wildcard; `PreflightMaxAge 1h`.
- **RateLimiting** (`Program.cs:170-217`, `Options/RateLimitingOptions.cs`): partition by client IP (`X-Forwarded-For` first entry → `RemoteIpAddress` → `unknown`); `FixedWindow` Global 120/60s and Auth 10/60s; `QueueLimit 0` / `RejectionStatusCode 429`.
- **Auth** (`Services/AuthService.cs`, `Program.cs:129-154`): HMAC-SHA256, 7-day expiry, claims `NameIdentifier/Email/Name/Role/JTI`; login/register confirm email (24h token SHA256, `FixedTimeEquals`), password reset 30-min token, logout revokes JTI 8 days; BCrypt hashes.
- **RevokedToken** (`Middleware/RevokedTokenMiddleware.cs`): after auth, checks `Jti` vs `ITokenRevocationStore`; `401 {error: Token has been revoked…}`.

---

## Configuration Reference

See the unified table in [Root README](../README.md#configuration) plus `appsettings.json:2-97` (Serilog + `Cors/ConnectionStrings/Jwt/R2/GoogleAi/Email/RateLimiting`) and `appsettings.Development.json` (Debug logging, dev CORS/JWT). All `Jwt:Key` checks happen at startup; the app crashes fast with `InvalidOperationException` if missing/short.

---

## Logging & Health

- **Serilog** (`appsettings.json:2-38`, `Program.cs:21-22`): console (`[{Timestamp:HH:mm:ss} {Level:u3}]`) + file `logs/app-*.log` (rolling daily, 30 entries, `flushToRunAtExactTime`); levels `Information` default, `Warning` for `Microsoft.AspNetCore/EF`, `Debug` for `Services`, `Information` for `Controllers/Handlers` (Development upgrades `Services/Controllers/Handlers` to `Debug`). Also binds `Logging:Console`.
- **Health** (`Program.cs:27-28, 238`): `AddHealthChecks().AddDbContextCheck<ApplicationDbContext>()` → `GET /health` (200 when DB reachable). Docker `HEALTHCHECK` hits it every 30s.
- **Lifecycle**: `ApplicationStarted/Stopping` log via `Log.Information`.

---

## Tests

```bash
dotnet test CebuUpskilling.Backend.Tests/CebuUpskilling.Backend.Tests.csproj
dotnet test --collect:"XPlat Code Coverage" --settings coverlet.runsettings
dotnet test --filter "AuthServiceTests"
```

Test project `CebuUpskilling.Backend.Tests` uses xUnit + Coverlet; `TestDbContextFactory` provides in-memory/EF test DB.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Jwt:Key is not configured` | `dotnet user-secrets set "Jwt:Key" "…≥32 chars"` |
| `Jwt:Key must be at least 32 characters` | Use a longer secret (HMAC-SHA256 requirement). |
| DB connection failed / `Npgsql` errors | Check `ConnectionStrings:DefaultConnection`, `docker compose ps`, run `dotnet ef database update`. |
| `Token has been revoked` (401) | JTI was logged out — sign in again (`POST /api/auth/login`). |
| 429 `Too Many Requests` | Per-IP rate limit hit — wait 60s or raise `RateLimiting__Global__PermitLimit`. |
| Gemini returns empty skills | Check `GoogleAi:ApiKey` and `GoogleAi:Model`; service degrades gracefully (no crash). |
| R2 uploads fail | Verify `R2:*` credentials and bucket CORS; `MediaController` will return 500 with handler message. |

