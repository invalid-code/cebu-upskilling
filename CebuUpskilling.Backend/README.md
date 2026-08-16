# Cebu Upskilling Backend

ASP.NET Core Web API for the Cebu Upskilling platform.

## Prerequisites

- .NET 10 SDK
- PostgreSQL 16 (or use `docker compose up db`)

## Configuration

Sensitive configuration (JWT signing key, database connection string, R2 credentials, OpenRouter API key) is **not** committed to the repository. It is provided via:

1. **.NET User Secrets** (local development) — recommended
2. **Environment variables** (Docker / production) — see `docker-compose.yml`

### Setting the JWT signing key (required)

The backend will not start without a valid `Jwt:Key` (at least 32 characters for HMAC-SHA256). Set it locally with:

```bash
dotnet user-secrets set "Jwt:Key" "your-32-character-minimum-secret-key-here" --project CebuUpskilling.Backend
```

You can also set the issuer and audience:

```bash
dotnet user-secrets set "Jwt:Issuer" "CebuUpskilling" --project CebuUpskilling.Backend
dotnet user-secrets set "Jwt:Audience" "CebuUpskillingClient" --project CebuUpskilling.Backend
```

### Other optional settings

```bash
# Database connection (if not using docker compose)
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=cebuupskilling;Username=postgres;Password=postgres" --project CebuUpskilling.Backend

# Cloudflare R2 (object storage)
dotnet user-secrets set "R2:AccountId" "..." --project CebuUpskilling.Backend
dotnet user-secrets set "R2:AccessKeyId" "..." --project CebuUpskilling.Backend
dotnet user-secrets set "R2:SecretAccessKey" "..." --project CebuUpskilling.Backend
dotnet user-secrets set "R2:BucketName" "..." --project CebuUpskilling.Backend
dotnet user-secrets set "R2:PublicBaseUrl" "..." --project CebuUpskilling.Backend

# OpenRouter (AI assessments)
dotnet user-secrets set "OpenRouter:ApiKey" "..." --project CebuUpskilling.Backend
```

## Running locally

```bash
# Start PostgreSQL (optional if you have a local instance)
docker compose up db

# Run the API
dotnet run --project CebuUpskilling.Backend
```

The API listens on `http://localhost:5179` by default (see `Properties/launchSettings.json`).

## Tests

```bash
dotnet test CebuUpskilling.Backend.Tests/CebuUpskilling.Backend.Tests.csproj