# AGENTS.md — Cebu Upskilling

Career-pathway platform: ASP.NET Core 10 API + React 19/Vite SPA + Expo mobile.
Three separately-run roots: `CebuUpskilling.Backend/`, `frontend/`, `mobile/`.
Detailed references (read these, don't re-derive): root `README.md`, `CebuUpskilling.Backend/README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`.

## Toolchain (verify, don't assume)
- .NET SDK **10.0.302** (`global.json`, `rollForward: latestFeature`). EF tools must target the backend project (see below).
- Node **26** (` .nvmrc`) — run `nvm use` in `frontend`/`mobile` before npm commands.
- PostgreSQL **16** (or `docker compose up db`).

## Backend essentials
- **Startup crashes** without `Jwt:Key` (≥32 chars, HMAC-SHA256). Set via user-secrets (local) or `Jwt__Key` env (Docker/prod). Other secrets (R2, Gemini, Resend, ConnectionStrings) are optional and degrade gracefully.
- Local secrets go in **.NET User Secrets** (store id `cebu-upskilling-backend-local`), never committed. Env-var form uses `__` as section separator (`Jwt__Key` → `Jwt:Key`).
- Run order: start Postgres → `dotnet ef database update --project CebuUpskilling.Backend` → `dotnet run --project CebuUpskilling.Backend --launch-profile http` (listens on `:5000`/`:5179`; OpenAPI + `/health` only in Development). Docker/compose serves `:8080`.
- **All `dotnet ef` commands need `--project CebuUpskilling.Backend`** (design-time factory in `Data/DesignTimeDbContextFactory.cs`). 28 timestamp-prefixed migrations; `migrations remove` only the last, only if unapplied.
- `Gemini` model default differs by source: `gemini-3-flash-preview` in `appsettings.json`, `gemini-2.5-flash` in `docker-compose.yml`. Don't "harmonize" blindly; it's intentional.
- Middleware order in `Program.cs` is load-bearing: SecurityHeaders → ExceptionHandler → CORS → StaticFiles → RateLimiter → Auth → RevokedToken → Authz. Rate limiting is per-IP via `X-Forwarded-For` (Global 120/60s, Auth 10/60s → `429`). Logged-out JTIs stay revoked 8 days.

## Frontend essentials
- **`src/api/client.js` uses `XMLHttpRequest` deliberately, not `fetch`** — a browser extension patches `fetch`. Do NOT "modernize" it to `fetch`; that breaks the build per the root README troubleshooting note.
- Vite proxies `/api` → `http://localhost:5000` (`vite.config.js`). Override with `VITE_API_URL` (`frontend/.env.development`).
- Lint is **oxlint** (`npm run lint`), not ESLint. Tests: `npm test` (vitest), `npm run test:watch`, `npm run test:e2e` (Playwright, expects SPA on `:5173`). Coverage thresholds are low (lines 50, branches 45) — don't raise without reason.

## Tests
- Backend: `dotnet test CebuUpskilling.Backend.Tests/...csproj`; filter with `--filter "AuthServiceTests"`; coverage via `--collect:"XPlat Code Coverage" --settings coverlet.runsettings`. Backend tests need **no Postgres** — integration tests boot the API via `ProductionApiFactory` on an isolated EF Core InMemory database with faked R2/Gemini. (Postgres is only needed to *run* the API, per Backend essentials above.)
- Run both `dotnet test` and `npm test` before pushing (per contributing note in root README).

## Conventions
- Branching off `main` with `feat/` / `fix/` prefixes; PRs against `main`; no `CONTRIBUTING.md` yet.
- `docs/` holds the real API/architecture spec; `CebuUpskillingDocumentation.pdf` is the product spec. When docs and code conflict, trust the code/README.
