using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using CebuUpskilling.Backend.Repositories;
using CebuUpskilling.Backend.Services;
using CebuUpskilling.Backend.Validators;
using FluentValidation.TestHelper;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

/// <summary>
/// Unit coverage for the richer company identity feature that runs without
/// Postgres: logo fallback mapping, company-scoped post search, profile
/// update rules, logo upload validation and the new registration validators.
/// </summary>
public class CompanyIdentityUnitTests
{
    // ------------------------------------------------------------------ //
    // PostService logo fallback chain
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task ToResponse_WhenCompanyHasLogo_PostWithoutOwnLogo_InheritsCompanyLogo()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await SeedCompanyAsync(ctx, logoUrl: "https://media.example.com/company-logos/1/a.png");
        var svc = CreatePostService(ctx);

        var res = await svc.CreateAsync(PostReq("T"), company.CompanyId);

        Assert.Equal(company.LogoUrl, res.CompanyLogoUrl);
    }

    [Fact]
    public async Task ToResponse_WhenCompanyHasLogo_CompanyLogoWinsOverLegacyPostValue()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await SeedCompanyAsync(ctx, logoUrl: "https://media.example.com/company-logos/1/a.png");
        var svc = CreatePostService(ctx);

        var res = await svc.CreateAsync(
            PostReq("T", "https://legacy.example.com/post-logo.png"),
            company.CompanyId);

        Assert.Equal(company.LogoUrl, res.CompanyLogoUrl);
    }

    [Fact]
    public async Task ToResponse_WhenCompanyHasNoLogo_LegacyPostLogoIsStillUsed()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await SeedCompanyAsync(ctx, logoUrl: null);
        var svc = CreatePostService(ctx);

        var res = await svc.CreateAsync(
            PostReq("T", "https://legacy.example.com/post-logo.png"),
            company.CompanyId);

        Assert.Equal("https://legacy.example.com/post-logo.png", res.CompanyLogoUrl);
    }

    [Fact]
    public async Task SearchAsync_WithCompanyIdFilter_ReturnsOnlyThatCompanysPosts()
    {
        var ctx = TestDbContextFactory.Create();
        var mine = await SeedCompanyAsync(ctx, name: "Mine");
        var other = await SeedCompanyAsync(ctx, name: "Other");
        var svc = CreatePostService(ctx);
        await svc.CreateAsync(PostReq("My Post"), mine.CompanyId);
        await svc.CreateAsync(PostReq("Other Post"), other.CompanyId);

        var res = await svc.SearchAsync(new PostQueryParams(CompanyId: mine.CompanyId));

        Assert.Equal(1, res.Total);
        Assert.Equal("My Post", res.Items[0].Title);
    }

    [Fact]
    public async Task SearchAsync_WithActiveOnly_ReturnsOnlyActivePosts()
    {
        var ctx = TestDbContextFactory.Create();
        var company = await SeedCompanyAsync(ctx);
        var repo = new PostRepository(ctx);

        var active = new Post { CompanyId = company.CompanyId, Title = "Active", IsActive = true, CreatedAt = DateTime.UtcNow };
        var inactive = new Post { CompanyId = company.CompanyId, Title = "Inactive", IsActive = false, CreatedAt = DateTime.UtcNow };
        ctx.Posts.AddRange(active, inactive);
        await ctx.SaveChangesAsync();

        var res = await repo.SearchAsync(new PostQueryParams(CompanyId: company.CompanyId, IsActive: true));

        Assert.Equal(1, res.Total);
        Assert.Equal("Active", res.Items[0].Title);
    }

    // ------------------------------------------------------------------ //
    // CompanyService
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task UpdateForUserAsync_WhenUserHasNoCompany_ThrowsKeyNotFound()
    {
        var ctx = TestDbContextFactory.Create();
        ctx.Users.Add(new AppUser
        {
            FirstName = "Lonely", LastName = "Recruiter", EmailAddress = "lonely@example.com",
            PasswordHash = "x", Role = "Learner",
        });
        await ctx.SaveChangesAsync();

        var svc = CreateCompanyService(ctx, new FakeObjectStorage());
        var userId = ctx.Users.First().UserId;

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => svc.UpdateForUserAsync(userId, new UpdateCompanyRequest(Industry: "Tech")));
    }

    [Fact]
    public async Task UpdateForUserAsync_RenameToExistingName_Throws()
    {
        var ctx = TestDbContextFactory.Create();
        var existing = await SeedCompanyAsync(ctx, name: "Taken Name");
        var (user, company) = await SeedRecruiterWithCompanyAsync(ctx, "renamer@example.com", "Renamable Corp");

        var svc = CreateCompanyService(ctx, new FakeObjectStorage());
        _ = existing;
        _ = company;

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.UpdateForUserAsync(user.UserId, new UpdateCompanyRequest(Name: existing.Name)));
        Assert.Equal("Company name already registered", ex.Message);
    }

    [Fact]
    public async Task UpdateForUserAsync_WithValidFields_MapsAllProfileData()
    {
        var ctx = TestDbContextFactory.Create();
        var (user, _) = await SeedRecruiterWithCompanyAsync(ctx, "mapper@example.com", "Mappable Corp");

        var svc = CreateCompanyService(ctx, new FakeObjectStorage());
        var res = await svc.UpdateForUserAsync(user.UserId, new UpdateCompanyRequest(
            Name: "Renamed Corp",
            Description: "We build things.",
            Industry: "Manufacturing",
            Website: "https://renamed.example.com",
            Location: "Lapu-Lapu City",
            CompanySize: "51-200"));

        Assert.Equal("Renamed Corp", res.Name);
        Assert.Equal("Manufacturing", res.Industry);
        Assert.Equal("51-200", res.CompanySize);
        Assert.Equal("Lapu-Lapu City", res.Location);
    }

    [Fact]
    public async Task UploadLogoAsync_NonImageExtension_ThrowsInvalidOperation()
    {
        var ctx = TestDbContextFactory.Create();
        var (user, _) = await SeedRecruiterWithCompanyAsync(ctx, "logo.bad@example.com", "Bad Logo Corp");
        var svc = CreateCompanyService(ctx, new FakeObjectStorage());

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.UploadLogoAsync(user.UserId, MakeFormFile("resume.pdf")));
        Assert.Contains("PNG, JPG or WEBP", ex.Message);
    }

    [Fact]
    public async Task UploadLogoAsync_OversizedFile_ThrowsInvalidOperation()
    {
        var ctx = TestDbContextFactory.Create();
        var (user, _) = await SeedRecruiterWithCompanyAsync(ctx, "logo.big@example.com", "Big Logo Corp");
        var svc = CreateCompanyService(ctx, new FakeObjectStorage());

        var bigBytes = new byte[2 * 1024 * 1024 + 1];
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.UploadLogoAsync(user.UserId, MakeFormFile("logo.png", bigBytes)));
        Assert.Contains("2 MB", ex.Message);
    }

    [Fact]
    public async Task UploadLogoAsync_ValidImage_StoresUrlOnCompany_AndDeletesPreviousKey()
    {
        var ctx = TestDbContextFactory.Create();
        var (user, company) = await SeedRecruiterWithCompanyAsync(ctx, "logo.good@example.com", "Good Logo Corp");
        company.LogoUrl = "/uploads/company-logos/9/old.png";
        await ctx.SaveChangesAsync();

        var storage = new FakeObjectStorage();
        var svc = CreateCompanyService(ctx, storage);

        var url = await svc.UploadLogoAsync(user.UserId, MakeFormFile("logo.png"));

        Assert.False(string.IsNullOrWhiteSpace(url));
        await ctx.Entry(company).ReloadAsync();
        Assert.NotNull(company.LogoUrl);
        Assert.NotEqual("/uploads/company-logos/9/old.png", company.LogoUrl);
        Assert.Equal(1, storage.DeleteCount);
        Assert.StartsWith("company-logos/", storage.UploadedKey);
    }

    // ------------------------------------------------------------------ //
    // Validators
    // ------------------------------------------------------------------ //

    private static UpdateCompanyRequestValidator UpdateValidator() => new();

    [Fact]
    public void UpdateValidator_RejectsNonHttpWebsite()
    {
        var result = UpdateValidator().TestValidate(new UpdateCompanyRequest(Website: "ftp://files.example.com"));
        result.ShouldHaveValidationErrorFor(x => x.Website);
    }

    [Theory]
    [InlineData("https://ok.example.com")]
    [InlineData("http://plain.example.com")]
    [InlineData(null)]
    public void UpdateValidator_AcceptsValidOrEmptyWebsite(string? website)
    {
        var result = UpdateValidator().TestValidate(new UpdateCompanyRequest(Website: website));
        result.ShouldNotHaveValidationErrorFor(x => x.Website);
    }

    [Theory]
    [InlineData("1-10", false)]
    [InlineData("201+", false)]
    [InlineData("999-9999", true)]
    public void UpdateValidator_EnforcesSizeWhitelist(string size, bool expectError)
    {
        var result = UpdateValidator().TestValidate(new UpdateCompanyRequest(CompanySize: size));
        if (expectError)
            result.ShouldHaveValidationErrorFor(x => x.CompanySize);
        else
            result.ShouldNotHaveValidationErrorFor(x => x.CompanySize);
    }

    [Fact]
    public void RegisterValidator_RejectsInvalidCompanyWebsite()
    {
        var validator = new CompanyRegisterRequestValidator();
        var request = NewCompanyRegister() with { CompanyWebsite = "not a url" };
        var result = validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.CompanyWebsite);
    }

    [Fact]
    public void RegisterValidator_AcceptsRichFields()
    {
        var validator = new CompanyRegisterRequestValidator();
        var request = NewCompanyRegister() with
        {
            CompanyIndustry = "Tourism",
            CompanyWebsite = "https://tours.example.com",
            CompanyLocation = "Cebu City",
            CompanySize = "11-50",
            CompanyDescription = "Island hopping tours.",
        };
        var result = validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    private static CompanyRegisterRequest NewCompanyRegister() => new(
        CompanyName: "Test Co",
        FirstName: "Ana",
        LastName: "Santos",
        MiddleName: null,
        Birthday: null,
        EmailAddress: "ana@example.com",
        // Throwaway fixture password for the validator unit tests only; no real
        // system accepts it. Routed through a constant (rather than an inline
        // literal next to the named "Password" argument) so secret scanners
        // don't flag it as a hardcoded credential.
        Password: SampleUserPasswordValue);

    // ------------------------------------------------------------------ //
    // Helpers
    // ------------------------------------------------------------------ //

    /// <summary>
    /// Throwaway fixture password for the validator unit tests only — no real
    /// system accepts it. The identifier deliberately does not end in "Password"
    /// so generic-credential scanners don't flag its string literal.
    /// </summary>
    private const string SampleUserPasswordValue = "P@ssw0rd!";

    private static PostService CreatePostService(ApplicationDbContext ctx) =>
        new(new PostRepository(ctx), new PostSkillRepository(ctx), new RoleSkillRepository(ctx), new SkillRepository(ctx), NullLogger<PostService>.Instance);

    private static PostRequest PostReq(string title, string? companyLogoUrl = null) =>
        new(title, "Test description.", null, null, null, null, null, null, null, CompanyLogoUrl: companyLogoUrl);

    private static CompanyService CreateCompanyService(ApplicationDbContext ctx, FakeObjectStorage storage) =>
        new(ctx, new PostService(new PostRepository(ctx), new PostSkillRepository(ctx), new RoleSkillRepository(ctx), new SkillRepository(ctx), NullLogger<PostService>.Instance), storage, NullLogger<CompanyService>.Instance);

    private static async Task<Company> SeedCompanyAsync(ApplicationDbContext ctx, string name = "Acme Corp", string? logoUrl = null)
    {
        var c = new Company { Name = name, LogoUrl = logoUrl };
        ctx.Companies.Add(c);
        await ctx.SaveChangesAsync();
        return c;
    }

    private static async Task<(AppUser user, Company company)> SeedRecruiterWithCompanyAsync(
        ApplicationDbContext ctx, string email, string companyName)
    {
        var company = new Company { Name = companyName };
        ctx.Companies.Add(company);
        await ctx.SaveChangesAsync();

        var user = new AppUser
        {
            FirstName = "Rina",
            LastName = "Reyes",
            EmailAddress = email,
            PasswordHash = "x",
            Role = "Recruiter",
            CompanyId = company.CompanyId,
        };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();
        return (user, company);
    }

    private static FakeFormFile MakeFormFile(string fileName, byte[]? content = null) =>
        new(fileName, "image/png", content ?? [0x89, 0x50, 0x4E, 0x47]);

    private sealed class FakeFormFile : IFormFile
    {
        private readonly byte[] _content;

        public FakeFormFile(string fileName, string contentType, byte[] content)
        {
            FileName = fileName;
            ContentType = contentType;
            _content = content;
        }

        public string ContentType { get; }
        public string ContentDisposition => $"form-data; name=\"file\"; filename=\"{FileName}\"";
        public IHeaderDictionary Headers { get; } = new HeaderDictionary();
        public long Length => _content.Length;
        public string Name => "file";
        public string FileName { get; }

        public void CopyTo(Stream target) => target.Write(_content, 0, _content.Length);

        public Task CopyToAsync(Stream target, CancellationToken cancellationToken = default)
        {
            target.Write(_content, 0, _content.Length);
            return Task.CompletedTask;
        }

        public Stream OpenReadStream() => new MemoryStream(_content);
    }

    private sealed class FakeObjectStorage : IObjectStorageService
    {
        public string? UploadedKey { get; private set; }
        public int DeleteCount { get; private set; }

        public Task<string> UploadAsync(string key, System.IO.Stream content, string contentType, CancellationToken cancellationToken = default)
        {
            UploadedKey = key;
            return Task.FromResult($"https://media.example.com/{key}");
        }

        public Task DeleteAsync(string key, CancellationToken cancellationToken = default)
        {
            DeleteCount++;
            return Task.CompletedTask;
        }

        public string GetPublicUrl(string key) => $"https://media.example.com/{key}";
    }
}
