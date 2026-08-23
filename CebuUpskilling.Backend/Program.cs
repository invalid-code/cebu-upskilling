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
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration));

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>();

builder.Services.Configure<R2Options>(builder.Configuration.GetSection(R2Options.SectionName));
builder.Services.Configure<GoogleAiOptions>(builder.Configuration.GetSection(GoogleAiOptions.SectionName));

var googleAiOptions = builder.Configuration.GetSection(GoogleAiOptions.SectionName).Get<GoogleAiOptions>();
builder.Services.AddHttpClient<IGoogleAiService, GoogleAiService>(client =>
{
    var baseUrl = googleAiOptions?.BaseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    client.BaseAddress = new Uri(baseUrl.EndsWith('/') ? baseUrl : baseUrl + "/");
});

var myAllowSpecificOrigins = "_myAllowSpecificOrigins";

var corsOriginsValue = builder.Configuration["Cors:AllowedOrigins"];
var allowedOrigins = string.IsNullOrWhiteSpace(corsOriginsValue)
    ? new[] { "http://localhost:5173" }
    : corsOriginsValue.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: myAllowSpecificOrigins, policy =>
        {
            policy.WithOrigins(allowedOrigins)
                .WithHeaders("Authorization", "Content-Type")
                .WithMethods("GET", "POST", "PATCH", "PUT", "DELETE");
        });
});


builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.SectionName));
var emailOptions = builder.Configuration.GetSection(EmailOptions.SectionName).Get<EmailOptions>();
if (!string.IsNullOrWhiteSpace(emailOptions?.ApiKey))
{
    builder.Services.AddHttpClient<IEmailService, ResendEmailService>(client =>
    {
        client.BaseAddress = new Uri(emailOptions!.BaseUrl);
    });
}
else
{
    builder.Services.AddScoped<IEmailService, LoggingEmailService>();
}
builder.Services.AddSingleton<ITokenRevocationStore, InMemoryTokenRevocationStore>();

builder.Services.AddScoped<ICourseRepository, CourseRepository>();
builder.Services.AddScoped<ILessonRepository, LessonRepository>();
builder.Services.AddScoped<IPostRepository, PostRepository>();
builder.Services.AddScoped<ILearnerRepository, LearnerRepository>();
builder.Services.AddScoped<ISkillRepository, SkillRepository>();
builder.Services.AddScoped<IAppUserRepository, AppUserRepository>();
builder.Services.AddScoped<IRoleSkillRepository, RoleSkillRepository>();
builder.Services.AddScoped<ILearnerSkillRepository, LearnerSkillRepository>();
builder.Services.AddScoped<ILearnerAssessmentRepository, LearnerAssessmentRepository>();
builder.Services.AddScoped<IAssessmentQuestionRepository, AssessmentQuestionRepository>();
builder.Services.AddScoped<ILearnerStudyCourseRepository, LearnerStudyCourseRepository>();
builder.Services.AddScoped<IApplicationRepository, ApplicationRepository>();
builder.Services.AddScoped<IMediaRepository, MediaRepository>();

builder.Services.AddScoped<IEntityService<Course>, CourseService>();

builder.Services.AddScoped<IEntityService<Post>, PostService>();
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<IEntityService<AppUser>, AppUserService>();
builder.Services.AddScoped<IEntityService<LearnerAssessment>, LearnerAssessmentService>();
builder.Services.AddScoped<IEntityService<LearnerStudyCourse>, LearnerStudyCourseService>();
builder.Services.AddScoped<ISkillGapService, SkillGapService>();
builder.Services.AddScoped<IJobseekerSkillParserAgent, JobseekerSkillParserAgent>();
// Backwards-compat: old interfaces now resolve to the unified agent
builder.Services.AddScoped<ISkillParsingService>(sp => sp.GetRequiredService<IJobseekerSkillParserAgent>());
builder.Services.AddScoped<IAssessmentService>(sp => sp.GetRequiredService<IJobseekerSkillParserAgent>());
builder.Services.AddScoped<IEnrollmentsService, EnrollmentsService>();
builder.Services.AddScoped<IApplicationsService, ApplicationsService>();
builder.Services.AddScoped<IStatsService, StatsService>();
builder.Services.AddScoped<ICoursesPageService, CoursesPageService>();
builder.Services.AddScoped<ICourseContentService, CourseContentService>();
builder.Services.AddScoped<IObjectStorageService, R2StorageService>();
builder.Services.AddScoped<IMediaService, MediaService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException(
    "Jwt:Key is not configured. Set Jwt:Key in appsettings.json or the Jwt__Key environment variable.");

if (jwtKey.Length < 32)
{
    throw new InvalidOperationException("Jwt:Key must be at least 32 characters long for HMAC-SHA256.");
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
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var rateLimitingOptions = builder.Configuration.GetSection(RateLimitingOptions.SectionName).Get<RateLimitingOptions>()
    ?? new RateLimitingOptions();
if (rateLimitingOptions.Enabled)
{
    // Rate limit per real client IP. Prefer X-Forwarded-For (set by a reverse proxy /
    // load balancer) and fall back to the direct connection address.
    static string GetClientIp(HttpContext httpContext)
    {
        var forwarded = httpContext.Request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var first = forwarded.Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(first))
            {
                return first;
            }
        }

        return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

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
app.MapControllers();
app.MapHealthChecks("/health");

app.Lifetime.ApplicationStarted.Register(() =>
    Log.Information("Application started"));

app.Lifetime.ApplicationStopping.Register(() =>
    Log.Information("Application is shutting down"));

app.Run();

Log.CloseAndFlush();

public partial class Program { }
