using System.Reflection;
using CebuUpskilling.Backend.Controllers;
using Microsoft.AspNetCore.Authorization;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Guards against accidental removal of role-based authorization.
/// If these attributes are dropped, the regression test fails before it reaches production.
/// Mirrors the intent of Integration/RoleSeparationApiTests but runs without Postgres.
/// </summary>
public class AuthorizationRegressionTests
{
    [Fact]
    public void LearnersController_RequiresLearnerRole()
    {
        var attr = typeof(LearnersController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal("Learner", attr!.Roles);
    }

    [Fact]
    public void CompaniesController_Create_RequiresRecruiterRole()
    {
        var method = typeof(CompaniesController).GetMethod("Create")!;
        var attr = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal("Recruiter", attr!.Roles);
    }

    [Fact]
    public void PostsController_Create_RequiresRecruiterRole()
    {
        var method = typeof(PostsController).GetMethod("Create")!;
        var attr = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal("Recruiter", attr!.Roles);
    }

    [Fact]
    public void PostsController_Update_RequiresRecruiterRole()
    {
        var method = typeof(PostsController).GetMethod("Update")!;
        var attr = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal("Recruiter", attr!.Roles);
    }

    [Fact]
    public void StatsController_Business_RequiresRecruiterRole()
    {
        var method = typeof(StatsController).GetMethod("GetBusinessStats")!;
        var attr = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal("Recruiter", attr!.Roles);
    }

    [Fact]
    public void StatsController_Week_RequiresLearnerRole()
    {
        var method = typeof(StatsController).GetMethod("GetWeeklyStats")!;
        var attr = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal("Learner", attr!.Roles);
    }

    [Fact]
    public void SkillsController_RequiresAuthorize()
    {
        var attr = typeof(SkillsController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
    }

    [Fact]
    public void CoursesPageController_RequiresAuthorize()
    {
        var type = typeof(CoursesPageController);
        var classAttr = type.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(classAttr);
        // Generic [Authorize] – any authenticated user; learner check is inside service
        Assert.True(string.IsNullOrEmpty(classAttr!.Roles));
    }
}
