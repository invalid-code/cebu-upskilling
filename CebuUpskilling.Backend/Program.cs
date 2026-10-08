using System.Net;
using System.Reflection;
using System.Text;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Handlers;
using CebuUpskilling.Backend.Options;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Error tracking is optional: without a Sentry DSN the app runs unchanged.
if (!string.IsNullOrWhiteSpace(builder.Configuration["Sentry:Dsn"]))
{
    builder.WebHost.UseSentry(options =>
    {
        options.TracesSampleRate = 0.1;
        options.SendDefaultPii = false;
    });
}

builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration));

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (connectionString != null && connectionString.StartsWith("InMemory:", StringComparison.OrdinalIgnoreCase))
{
    var dbName = connectionString.Substring("InMemory:".Length).Trim();
    if (string.IsNullOrWhiteSpace(dbName)) dbName = "cebu-upskilling";
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseInMemoryDatabase(dbName));
}
else
{
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseNpgsql(connectionString));
}

builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>();

builder.Services.Configure<R2Options>(builder.Configuration.GetSection(R2Options.SectionName));
builder.Services.Configure<GoogleAiOptions>(builder.Configuration.GetSection(GoogleAiOptions.SectionName));
builder.Services.Configure<GoogleOAuthOptions>(builder.Configuration.GetSection(GoogleOAuthOptions.SectionName));

var googleAiOptions = builder.Configuration.GetSection(GoogleAiOptions.SectionName).Get<GoogleAiOptions>();
builder.Services.AddHttpClient<IGoogleAiService, GoogleAiService>(client =>
{
    var baseUrl = googleAiOptions?.BaseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    client.BaseAddress = new Uri(baseUrl.EndsWith('/') ? baseUrl : baseUrl + "/");
    // Bound a hung generation instead of letting the caller wait the 100 s default.
    client.Timeout = TimeSpan.FromSeconds(60);
});

var myAllowSpecificOrigins = "_myAllowSpecificOrigins";

// Backend only receives requests from the configured frontend origin(s) and only
// handles JSON / multipart requests with Bearer auth. Derive CORS directly from
// what the controllers actually handle: GET/POST/PUT/PATCH/DELETE and the two
// headers the frontend sends (Authorization, Content-Type). No credentials, no
// wildcard, no extra headers/methods.
var corsOriginsValue = builder.Configuration["Cors:AllowedOrigins"];
var allowedOrigins = string.IsNullOrWhiteSpace(corsOriginsValue)
    ? new[] { "http://localhost:5173" }
    : corsOriginsValue.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(o => o.Trim().TrimEnd('/'))
        .Where(o => Uri.TryCreate(o, UriKind.Absolute, out var uri)
                    && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

if (allowedOrigins.Length == 0)
    allowedOrigins = new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: myAllowSpecificOrigins, policy =>
        {
            policy.WithOrigins(allowedOrigins)
                // Frontend XHR only sends these two; multipart upload still uses Content-Type
                .WithHeaders("Authorization", "Content-Type")
                // Exact methods exposed by Controllers (grep HttpGet/Post/Put/Patch/Delete)
                .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                .SetPreflightMaxAge(TimeSpan.FromHours(1));
        });
});


builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IGoogleTokenVerifier, GoogleTokenVerifier>();
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.SectionName));
builder.Services.Configure<FrontendOptions>(builder.Configuration.GetSection(FrontendOptions.SectionName));
var emailOptions = builder.Configuration.GetSection(EmailOptions.SectionName).Get<EmailOptions>();
if (!string.IsNullOrWhiteSpace(emailOptions?.ApiKey))
{
    builder.Services.AddHttpClient<IEmailService, ResendEmailService>(client =>
    {
        client.BaseAddress = new Uri(emailOptions!.BaseUrl);
        client.Timeout = TimeSpan.FromSeconds(30);
    });
}
else
{
    builder.Services.AddScoped<IEmailService, LoggingEmailService>();
}
builder.Services.AddSingleton<ITokenRevocationStore, InMemoryTokenRevocationStore>();
builder.Services.AddSingleton<IResumeParseQueue, ResumeParseQueue>();
builder.Services.AddHostedService<ResumeParseWorker>();
builder.Services.AddSingleton<ICompanyImageQueue, CompanyImageQueue>();
builder.Services.AddHostedService<CompanyImageWorker>();

builder.Services.AddScoped<ICourseRepository, CourseRepository>();
builder.Services.AddScoped<ILessonRepository, LessonRepository>();
builder.Services.AddScoped<IPostRepository, PostRepository>();
builder.Services.AddScoped<IPostSkillRepository, PostSkillRepository>();
builder.Services.AddScoped<ILearnerRepository, LearnerRepository>();
builder.Services.AddScoped<ISkillRepository, SkillRepository>();
builder.Services.AddScoped<IAppUserRepository, AppUserRepository>();
builder.Services.AddScoped<IRoleSkillRepository, RoleSkillRepository>();
builder.Services.AddScoped<ILearnerSkillRepository, LearnerSkillRepository>();
builder.Services.AddScoped<ILearnerAssessmentRepository, LearnerAssessmentRepository>();
builder.Services.AddScoped<IAssessmentQuestionRepository, AssessmentQuestionRepository>();
builder.Services.AddScoped<ILearnerStudyCourseRepository, LearnerStudyCourseRepository>();
builder.Services.AddScoped<IApplicationRepository, ApplicationRepository>();
builder.Services.AddScoped<ILearnerNoteRepository, LearnerNoteRepository>();
builder.Services.AddScoped<IDiscussionPostRepository, DiscussionPostRepository>();
builder.Services.AddScoped<IMediaRepository, MediaRepository>();

builder.Services.AddScoped<IEntityService<Course>, CourseService>();

builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<IEntityService<AppUser>, AppUserService>();
builder.Services.AddScoped<IEntityService<LearnerAssessment>, LearnerAssessmentService>();
builder.Services.AddScoped<IEntityService<LearnerStudyCourse>, LearnerStudyCourseService>();
builder.Services.AddScoped<ISkillGapService, SkillGapService>();
builder.Services.AddScoped<IJobseekerSkillParserAgent, JobseekerSkillParserAgent>();
builder.Services.AddScoped<IEmployerHiringAgent, EmployerHiringAgent>();
builder.Services.AddScoped<IEnrollmentsService, EnrollmentsService>();
builder.Services.AddScoped<IApplicationsService, ApplicationsService>();
builder.Services.AddScoped<IStatsService, StatsService>();
builder.Services.AddScoped<ICoursesPageService, CoursesPageService>();
builder.Services.AddScoped<ICourseContentService, CourseContentService>();
builder.Services.AddScoped<INotesService, NotesService>();
builder.Services.AddScoped<IDiscussionService, DiscussionService>();
builder.Services.AddScoped<ICourseGenerationAgent, CourseGenerationAgent>();
// Singleton: the service holds a single long-lived S3 client. Registered scoped it
// built a new AmazonS3Client per request and never disposed it.
builder.Services.AddSingleton<IObjectStorageService, R2StorageService>();
builder.Services.AddScoped<IMediaService, MediaService>();
builder.Services.AddScoped<ICompanyService, CompanyService>();
builder.Services.AddScoped<IResumeService, ResumeService>();
builder.Services.AddScoped<IJobMarketTrendService, JobMarketTrendService>();
builder.Services.AddScoped<ILearningPathwayAgent, LearningPathwayAgent>();

// Skills seed background job: fills the Skills table from a pluggable source.
// No SkillsSeed:SourceUrl -> static catalog; URL set -> remote API (with static fallback).
builder.Services.Configure<SkillsSeedOptions>(builder.Configuration.GetSection(SkillsSeedOptions.SectionName));
if (string.IsNullOrWhiteSpace(builder.Configuration["SkillsSeed:SourceUrl"]))
{
    builder.Services.AddSingleton<ISkillsSource, StaticSkillsSource>();
}
else
{
    builder.Services.AddHttpClient<ISkillsSource, ApiSkillsSource>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(15);
    });
}
builder.Services.AddHostedService<SkillsSeedService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException(
    "Jwt:Key is not configured. Set Jwt:Key in appsettings.json or the Jwt__Key environment variable.");

if (jwtKey.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key must be at least 32 characters (256 bits) for HMAC-SHA256. Provide a base64-encoded value of at least 32 bytes (e.g. 43-character base64 strings are typical). Set Jwt:Key in appsettings.json or the Jwt__Key environment variable.");
}
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
builder.Services.AddFluentValidationAutoValidation();

builder.Services.AddAuthorization();
builder.Services.AddControllers(options =>
{
    options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
}).AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    // Keep validation failures on the same {"error": "..."} contract as the rest of the API.
    options.InvalidModelStateResponseFactory = context =>
    {
        var firstError = context.ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? e.Exception?.Message : e.ErrorMessage)
            .FirstOrDefault(e => !string.IsNullOrWhiteSpace(e)) ?? "Invalid request";
        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new { error = firstError });
    };
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var rateLimitingOptions = builder.Configuration.GetSection(RateLimitingOptions.SectionName).Get<RateLimitingOptions>()
    ?? new RateLimitingOptions();

// Forwarded headers. The API only honours X-Forwarded-For / X-Forwarded-Proto when the
// immediate peer is an explicitly trusted reverse proxy (loopback by default, plus anything
// listed in ForwardedHeaders:KnownProxies / ForwardedHeaders:KnownNetworks). Anything else
// is ignored, so a direct client cannot rotate X-Forwarded-For to escape rate limiting and
// cannot fake HTTPS to turn on HSTS. Must run first so request.Scheme/RemoteIpAddress are
// settled before SecurityHeaders and the rate limiter read them.
static string[] SplitCsv(string? value) =>
    value?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [];

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    foreach (var entry in SplitCsv(builder.Configuration["ForwardedHeaders:KnownProxies"]))
    {
        if (IPAddress.TryParse(entry, out var proxy))
            options.KnownProxies.Add(proxy);
        else
            Log.Warning("Ignoring unparsable ForwardedHeaders:KnownProxies entry {Entry}", entry);
    }

    foreach (var entry in SplitCsv(builder.Configuration["ForwardedHeaders:KnownNetworks"]))
    {
        if (System.Net.IPNetwork.TryParse(entry, out var network))
            options.KnownIPNetworks.Add(network);
        else
            Log.Warning("Ignoring unparsable ForwardedHeaders:KnownNetworks entry {Entry}", entry);
    }
});

if (rateLimitingOptions.Enabled)
{
    // Rate limit per real client IP. UseForwardedHeaders has already replaced
    // RemoteIpAddress with the originating client when — and only when — the peer
    // is a configured trusted proxy; otherwise this is the socket peer, which the
    // client cannot forge.
    static string GetClientIp(HttpContext httpContext) =>
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: GetClientIp(httpContext),
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = rateLimitingOptions.Global.PermitLimit,
                    Window = TimeSpan.FromSeconds(rateLimitingOptions.Global.WindowSeconds),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = rateLimitingOptions.Global.QueueLimit,
                }));

        options.AddPolicy("auth", httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: GetClientIp(httpContext),
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = rateLimitingOptions.Auth.PermitLimit,
                    Window = TimeSpan.FromSeconds(rateLimitingOptions.Auth.WindowSeconds),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = rateLimitingOptions.Auth.QueueLimit,
                }));
    });
}

builder.Services.AddMemoryCache();
builder.Services.Configure<DuplicateRequestCacheOptions>(builder.Configuration.GetSection(DuplicateRequestCacheOptions.SectionName));
builder.Services.Configure<ServiceCacheOptions>(builder.Configuration.GetSection(ServiceCacheOptions.SectionName));

var app = builder.Build();

// Seed reference data (course taxonomy, skill catalog, role skill levels)
// on relational databases when the tables are empty. Skipped for the EF Core
// InMemory provider: tests seed themselves via TestDataSeeder.
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (db.Database.ProviderName != "Microsoft.EntityFrameworkCore.InMemory")
        await ReferenceDataSeeder.SeedAsync(db);
}
catch (Exception ex)
{
    Log.Warning(ex, "Reference data seeding failed; continuing startup");
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseForwardedHeaders();
app.UseMiddleware<CebuUpskilling.Backend.Middleware.SecurityHeadersMiddleware>();
app.UseExceptionHandler();
app.UseCors(myAllowSpecificOrigins);
app.UseStaticFiles();
if (rateLimitingOptions.Enabled)
{
    app.UseRateLimiter();
}
app.UseAuthentication();
app.UseMiddleware<CebuUpskilling.Backend.Middleware.RevokedTokenMiddleware>();
app.UseAuthorization();
app.UseMiddleware<CebuUpskilling.Backend.Middleware.DuplicateRequestCacheMiddleware>();
app.MapControllers();
app.MapHealthChecks("/health");

app.Lifetime.ApplicationStarted.Register(() =>
    Log.Information("Application started"));

app.Lifetime.ApplicationStopping.Register(() =>
    Log.Information("Application is shutting down"));

app.Run();

Log.CloseAndFlush();

public partial class Program { }
