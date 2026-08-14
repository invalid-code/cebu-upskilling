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
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Serilog;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration));

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>();

builder.Services.Configure<R2Options>(builder.Configuration.GetSection(R2Options.SectionName));
builder.Services.Configure<OpenRouterOptions>(builder.Configuration.GetSection(OpenRouterOptions.SectionName));

var openRouterOptions = builder.Configuration.GetSection(OpenRouterOptions.SectionName).Get<OpenRouterOptions>();
builder.Services.AddHttpClient<IOpenRouterService, OpenRouterService>(client =>
{
    var baseUrl = openRouterOptions?.BaseUrl ?? "https://openrouter.ai/api/v1";
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
                .WithMethods("GET", "POST", "PATCH");
        });
});


builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();

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
builder.Services.AddScoped<IRecruiterRepository, RecruiterRepository>();
builder.Services.AddScoped<ILearnerStudyCourseRepository, LearnerStudyCourseRepository>();
builder.Services.AddScoped<IApplicationRepository, ApplicationRepository>();
builder.Services.AddScoped<IMediaRepository, MediaRepository>();

builder.Services.AddScoped<IEntityService<Course>, CourseService>();

builder.Services.AddScoped<IEntityService<Post>, PostService>();
builder.Services.AddScoped<IEntityService<AppUser>, AppUserService>();
builder.Services.AddScoped<IEntityService<LearnerAssessment>, LearnerAssessmentService>();
builder.Services.AddScoped<IEntityService<LearnerStudyCourse>, LearnerStudyCourseService>();
builder.Services.AddScoped<ISkillGapService, SkillGapService>();
builder.Services.AddScoped<IAssessmentService, AssessmentService>();
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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler();
app.UseCors(myAllowSpecificOrigins);
app.UseAuthentication();
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
