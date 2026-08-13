using System.Text;
using CebuUpskilling.Backend.Controllers;
using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Services;
using CebuUpskilling.Backend.Validators;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// Allow writing DateTime values with Kind=Unspecified (e.g. from JSON deserialization)
// to PostgreSQL 'timestamp with time zone' columns, which Npgsql otherwise rejects.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var myAllowSpecificOrigins = "_myAllowSpecificOrigins";

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: myAllowSpecificOrigins, policy =>
        {
            policy.WithOrigins(
                    "http://localhost:5173",
                    "http://localhost:5174",
                    "http://localhost:5175",
                    "http://localhost:5179")
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});


builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEntityService<Discipline>, DisciplineService>();
builder.Services.AddScoped<IEntityService<SubDiscipline>, SubDisciplineService>();
builder.Services.AddScoped<IEntityService<Genre>, GenreService>();
builder.Services.AddScoped<IEntityService<Course>, CourseService>();
builder.Services.AddScoped<IEntityService<Lesson>, LessonService>();
builder.Services.AddScoped<IEntityService<LessonContent>, LessonContentService>();
builder.Services.AddScoped<IEntityService<Exercise>, ExerciseService>();
builder.Services.AddScoped<IEntityService<Company>, CompanyService>();
builder.Services.AddScoped<IEntityService<Post>, PostService>();
builder.Services.AddScoped<IEntityService<Learner>, LearnerService>();
builder.Services.AddScoped<LearnerService>();
builder.Services.AddScoped<ISkillGapService, SkillGapService>();
builder.Services.AddScoped<IAssessmentService, AssessmentService>();

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();

var jwtKey = builder.Configuration["Jwt:Key"]!;
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

builder.Services.AddAuthorization();
builder.Services.AddControllers(options =>
{
    options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
}).AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});
builder.Services.AddOpenApi();

var app = builder.Build();

// Some browser extensions/injections strip the "/api" prefix from outgoing
// requests (e.g. "/auth/register-company" arrives instead of "/api/auth/register-company").
// Rewrite any non-API, non-OpenAPI request to carry the "/api" prefix so the
// controllers handle it. This MUST run before routing picks the endpoint.
app.Use(async (context, next) =>
{
    var rawPath = context.Request.Path.Value ?? "";
    if (!rawPath.StartsWith("/api", StringComparison.OrdinalIgnoreCase) &&
        !rawPath.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/api" + rawPath;
    }
    await next();
});

app.UseRouting();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(myAllowSpecificOrigins);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Lifetime.ApplicationStarted.Register(() =>
    app.Services.GetRequiredService<ILogger<Program>>().LogInformation("Application started"));

app.Lifetime.ApplicationStopping.Register(() =>
    app.Services.GetRequiredService<ILogger<Program>>().LogInformation("Application is shutting down"));

app.Run();

public partial class Program { }