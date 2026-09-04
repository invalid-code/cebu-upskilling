using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.IO.Compression;

namespace CebuUpskilling.Backend.Tests.Integration;

public class ResumeProfileApiTests : ProductionApiTestBase
{
    public ResumeProfileApiTests(ProductionApiFactory factory) : base(factory) { }

    private static byte[] CreateFakePdfBytes(string text = "Experienced developer with React")
    {
        var sb = new StringBuilder();
        sb.Append("%PDF-1.4\n");
        sb.Append("1 0 obj << /Type /Catalog >> endobj\n");
        sb.Append($"BT ({text}) Tj ET");
        sb.Append("\ntrailer << >>\n%%EOF");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static byte[] CreateFakeDocxBytes(string text = "Experienced developer with Python")
    {
        var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            var ct = zip.CreateEntry("[Content_Types].xml");
            using (var w = new StreamWriter(ct.Open())) w.Write(@"<Types xmlns=""http://schemas.openxmlformats.org/package/2006/content-types""><Override PartName=""/word/document.xml"" ContentType=""application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml""/></Types>");
            var doc = zip.CreateEntry("word/document.xml");
            using (var w = new StreamWriter(doc.Open())) w.Write($@"<w:document xmlns:w=""http://schemas.openxmlformats.org/wordprocessingml/2006/main""><w:body><w:p><w:r><w:t>{System.Security.SecurityElement.Escape(text)}</w:t></w:r></w:p></w:body></w:document>");
        }
        return ms.ToArray();
    }

    private async Task<HttpResponseMessage> RegisterLearnerWithPdfAsync(string email, string text = "Experienced developer with React")
    {
        var form = new MultipartFormDataContent();
        form.Add(new StringContent("Jose"), "firstName");
        form.Add(new StringContent("Rizal"), "lastName");
        form.Add(new StringContent(email), "emailAddress");
        form.Add(new StringContent("P@ssw0rd!"), "password");
        form.Add(new StringContent("Learner"), "role");
        var pdfBytes = CreateFakePdfBytes(text);
        var fileContent = new ByteArrayContent(pdfBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        form.Add(fileContent, "resumeFile", "resume.pdf");
        return await Client.PostAsync("/api/auth/register", form);
    }

    private async Task<HttpResponseMessage> RegisterLearnerWithDocxAsync(string email, string text = "Experienced developer with Python")
    {
        var form = new MultipartFormDataContent();
        form.Add(new StringContent("Jose"), "firstName");
        form.Add(new StringContent("Rizal"), "lastName");
        form.Add(new StringContent(email), "emailAddress");
        form.Add(new StringContent("P@ssw0rd!"), "password");
        form.Add(new StringContent("Learner"), "role");
        var docxBytes = CreateFakeDocxBytes(text);
        var fileContent = new ByteArrayContent(docxBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        form.Add(fileContent, "resumeFile", "resume.docx");
        return await Client.PostAsync("/api/auth/register", form);
    }

    [RequiresPostgresFact]
    public async Task Register_WithPdf_ReturnsResumeUrl_AndProfileDisplaysIt()
    {
        var email = "resume.profile.pdf@example.com";
        var registerResponse = await RegisterLearnerWithPdfAsync(email);
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);
        var registerBody = await ReadJsonAsync(registerResponse);
        var resumeUrl = registerBody.GetProperty("resumeUrl").GetString();
        Assert.False(string.IsNullOrWhiteSpace(resumeUrl));
        Assert.StartsWith("https://fake-storage.example/resumes/", resumeUrl);
        Assert.EndsWith(".pdf", resumeUrl);

        var token = registerBody.GetProperty("token").GetString()!;
        var profileResponse = await AuthorizedClient(token).GetAsync("/api/auth/profile");
        Assert.Equal(HttpStatusCode.OK, profileResponse.StatusCode);
        var profileBody = await ReadJsonAsync(profileResponse);
        Assert.Equal(resumeUrl, profileBody.GetProperty("resumeUrl").GetString());
    }

    [RequiresPostgresFact]
    public async Task Register_WithDocx_ReturnsResumeUrl_AndProfileDisplaysIt()
    {
        var email = "resume.profile.docx@example.com";
        var registerResponse = await RegisterLearnerWithDocxAsync(email);
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);
        var body = await ReadJsonAsync(registerResponse);
        var resumeUrl = body.GetProperty("resumeUrl").GetString();
        Assert.False(string.IsNullOrWhiteSpace(resumeUrl));
        Assert.EndsWith(".docx", resumeUrl);

        var token = body.GetProperty("token").GetString()!;
        var profileResponse = await AuthorizedClient(token).GetAsync("/api/auth/profile");
        var profileBody = await ReadJsonAsync(profileResponse);
        Assert.Equal(resumeUrl, profileBody.GetProperty("resumeUrl").GetString());
    }

    [RequiresPostgresFact]
    public async Task Login_ReturnsResumeUrl()
    {
        var email = "resume.login@example.com";
        var reg = await RegisterLearnerWithPdfAsync(email);
        reg.EnsureSuccessStatusCode();

        var loginResponse = await LoginAsync(new { emailAddress = email, password = "P@ssw0rd!" });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var body = await ReadJsonAsync(loginResponse);
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("resumeUrl").GetString()));
    }

    [RequiresPostgresFact]
    public async Task Profile_WithoutAuth_ReturnsUnauthorized()
    {
        var response = await Client.GetAsync("/api/auth/profile");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [RequiresPostgresFact]
    public async Task Register_WithFakePdfContentTypeMismatch_ReturnsBadRequest()
    {
        // Upload a file named .pdf but containing plain text without %PDF magic
        var form = new MultipartFormDataContent();
        form.Add(new StringContent("Jose"), "firstName");
        form.Add(new StringContent("Rizal"), "lastName");
        form.Add(new StringContent("resume.fake.pdf@example.com"), "emailAddress");
        form.Add(new StringContent("P@ssw0rd!"), "password");
        form.Add(new StringContent("Learner"), "role");
        var txtBytes = Encoding.UTF8.GetBytes("This is not a pdf");
        var fileContent = new ByteArrayContent(txtBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        form.Add(fileContent, "resumeFile", "resume.pdf");

        var response = await Client.PostAsync("/api/auth/register", form);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Contains("valid PDF or DOCX", body.GetProperty("error").GetString(), StringComparison.OrdinalIgnoreCase);
    }

    [RequiresPostgresFact]
    public async Task Register_WithFakeDocxContentTypeMismatch_ReturnsBadRequest()
    {
        // Upload a .docx file that is actually plain text, not a ZIP
        var form = new MultipartFormDataContent();
        form.Add(new StringContent("Jose"), "firstName");
        form.Add(new StringContent("Rizal"), "lastName");
        form.Add(new StringContent("resume.fake.docx@example.com"), "emailAddress");
        form.Add(new StringContent("P@ssw0rd!"), "password");
        form.Add(new StringContent("Learner"), "role");
        var txtBytes = Encoding.UTF8.GetBytes("fake docx content");
        var fileContent = new ByteArrayContent(txtBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        form.Add(fileContent, "resumeFile", "resume.docx");

        var response = await Client.PostAsync("/api/auth/register", form);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await ReadJsonAsync(response);
        Assert.Contains("valid PDF or DOCX", body.GetProperty("error").GetString(), StringComparison.OrdinalIgnoreCase);
    }

    [RequiresPostgresFact]
    public async Task UpdateProfile_PreservesResumeUrl()
    {
        var email = "resume.preserve@example.com";
        var reg = await RegisterLearnerWithPdfAsync(email);
        reg.EnsureSuccessStatusCode();
        var regBody = await ReadJsonAsync(reg);
        var token = regBody.GetProperty("token").GetString()!;
        var originalUrl = regBody.GetProperty("resumeUrl").GetString();

        var updateResponse = await AuthorizedClient(token).PatchAsJsonAsync("/api/auth/profile", new { targetRole = "Backend Developer" });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updatedBody = await ReadJsonAsync(updateResponse);
        Assert.Equal(originalUrl, updatedBody.GetProperty("resumeUrl").GetString());
    }
}
