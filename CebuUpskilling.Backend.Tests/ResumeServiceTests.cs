using System.IO.Compression;
using System.Text;
using CebuUpskilling.Backend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class ResumeServiceTests
{
    private class FakeStorage : IObjectStorageService
    {
        public string? LastKey { get; private set; }
        public string? LastContentType { get; private set; }
        public Task<string> UploadAsync(string key, Stream content, string contentType, CancellationToken ct = default)
        {
            LastKey = key;
            LastContentType = contentType;
            return Task.FromResult($"https://fake.example/{key}");
        }
        public Task DeleteAsync(string key, CancellationToken ct = default) => Task.CompletedTask;
        public string GetPublicUrl(string key) => $"https://fake.example/{key}";
    }

    private static ResumeService CreateService(FakeStorage? storage = null)
    {
        storage ??= new FakeStorage();
        return new ResumeService(storage, NullLogger<ResumeService>.Instance);
    }

    private static IFormFile FakePdf(string text = "Hello")
    {
        var sb = new StringBuilder();
        sb.Append("%PDF-1.4\n");
        sb.Append("1 0 obj << /Type /Catalog >> endobj\n");
        sb.Append($"BT ({text}) Tj ET");
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var ms = new MemoryStream(bytes);
        return new FormFile(ms, 0, bytes.Length, "resumeFile", "resume.pdf") { Headers = new HeaderDictionary(), ContentType = "application/pdf" };
    }

    private static IFormFile FakeDocx(string text = "Hello")
    {
        var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            var ctEntry = zip.CreateEntry("[Content_Types].xml");
            using (var w = new StreamWriter(ctEntry.Open())) w.Write(@"<Types xmlns=""http://schemas.openxmlformats.org/package/2006/content-types""><Override PartName=""/word/document.xml"" ContentType=""application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml""/></Types>");
            var doc = zip.CreateEntry("word/document.xml");
            using (var w = new StreamWriter(doc.Open())) w.Write($@"<w:document xmlns:w=""http://schemas.openxmlformats.org/wordprocessingml/2006/main""><w:body><w:p><w:r><w:t>{System.Security.SecurityElement.Escape(text)}</w:t></w:r></w:p></w:body></w:document>");
        }
        ms.Position = 0;
        var bytes = ms.ToArray();
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "resumeFile", "resume.docx") { Headers = new HeaderDictionary(), ContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    }

    private static IFormFile FakeTxtWithPdfExtension(string text = "not pdf")
    {
        var bytes = Encoding.UTF8.GetBytes(text);
        var ms = new MemoryStream(bytes);
        return new FormFile(ms, 0, bytes.Length, "resumeFile", "resume.pdf") { Headers = new HeaderDictionary(), ContentType = "application/pdf" };
    }

    private static IFormFile FakePdfBytesWithDocxExtension()
    {
        var bytes = Encoding.UTF8.GetBytes("%PDF-1.4 fake");
        var ms = new MemoryStream(bytes);
        return new FormFile(ms, 0, bytes.Length, "resumeFile", "resume.docx") { Headers = new HeaderDictionary(), ContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    }

    private static IFormFile EmptyFile()
    {
        var ms = new MemoryStream(Array.Empty<byte>());
        return new FormFile(ms, 0, 0, "resumeFile", "resume.pdf") { Headers = new HeaderDictionary(), ContentType = "application/pdf" };
    }

    [Fact]
    public void Validate_ValidPdf_DoesNotThrow()
    {
        var svc = CreateService();
        var file = FakePdf("test");
        var ex = Record.Exception(() => svc.Validate(file));
        Assert.Null(ex);
    }

    [Fact]
    public void Validate_ValidDocx_DoesNotThrow()
    {
        var svc = CreateService();
        var file = FakeDocx("test");
        var ex = Record.Exception(() => svc.Validate(file));
        Assert.Null(ex);
    }

    [Fact]
    public void Validate_TxtWithPdfExtension_Throws()
    {
        var svc = CreateService();
        var file = FakeTxtWithPdfExtension("plain text not pdf");
        var ex = Assert.Throws<InvalidOperationException>(() => svc.Validate(file));
        Assert.Contains("valid PDF or DOCX", ex.Message);
    }

    [Fact]
    public void Validate_PdfBytesWithDocxExtension_Throws()
    {
        var svc = CreateService();
        var file = FakePdfBytesWithDocxExtension();
        var ex = Assert.Throws<InvalidOperationException>(() => svc.Validate(file));
        Assert.Contains("valid PDF or DOCX", ex.Message);
    }

    [Fact]
    public void Validate_EmptyFile_Throws()
    {
        var svc = CreateService();
        var file = EmptyFile();
        var ex = Assert.Throws<InvalidOperationException>(() => svc.Validate(file));
        Assert.Contains("required", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_InvalidExtension_Throws()
    {
        var svc = CreateService();
        var bytes = Encoding.UTF8.GetBytes("%PDF-1.4");
        var ms = new MemoryStream(bytes);
        var file = new FormFile(ms, 0, bytes.Length, "resumeFile", "resume.txt") { Headers = new HeaderDictionary(), ContentType = "text/plain" };
        var ex = Assert.Throws<InvalidOperationException>(() => svc.Validate(file));
        Assert.Contains("PDF or DOCX", ex.Message);
    }

    [Fact]
    public void Validate_Oversized_Throws()
    {
        var svc = CreateService();
        var big = new byte[10 * 1024 * 1024 + 1];
        big[0] = 0x25; big[1] = 0x50; big[2] = 0x44; big[3] = 0x46; // %PDF
        var ms = new MemoryStream(big);
        var file = new FormFile(ms, 0, big.Length, "resumeFile", "resume.pdf") { Headers = new HeaderDictionary(), ContentType = "application/pdf" };
        var ex = Assert.Throws<InvalidOperationException>(() => svc.Validate(file));
        Assert.Contains("10 MB", ex.Message);
    }

    [Fact]
    public async Task ExtractText_Pdf_ReturnsText()
    {
        var svc = CreateService();
        var file = FakePdf("UniqueSkill123");
        var text = await svc.ExtractTextAsync(file);
        Assert.Contains("UniqueSkill123", text);
    }

    [Fact]
    public async Task ExtractText_Docx_ReturnsText()
    {
        var svc = CreateService();
        var file = FakeDocx("DocxSkill456");
        var text = await svc.ExtractTextAsync(file);
        Assert.Contains("DocxSkill456", text);
    }

    [Fact]
    public async Task Upload_Pdf_ReturnsUrlWithCorrectExtensionAndContentType()
    {
        var storage = new FakeStorage();
        var svc = CreateService(storage);
        var file = FakePdf("hello");
        var url = await svc.UploadAsync(file);
        Assert.StartsWith("https://fake.example/resumes/", url);
        Assert.EndsWith(".pdf", url);
        Assert.Equal("application/pdf", storage.LastContentType);
        Assert.StartsWith("resumes/", storage.LastKey);
    }

    [Fact]
    public async Task Upload_Docx_ReturnsUrlWithDocxExtension()
    {
        var storage = new FakeStorage();
        var svc = CreateService(storage);
        var file = FakeDocx("hello");
        var url = await svc.UploadAsync(file);
        Assert.EndsWith(".docx", url);
        Assert.Equal("application/vnd.openxmlformats-officedocument.wordprocessingml.document", storage.LastContentType);
    }

    [Fact]
    public async Task ProcessAsync_ValidPdf_ReturnsUrlAndText()
    {
        var storage = new FakeStorage();
        var svc = CreateService(storage);
        var file = FakePdf("ProcessTest");
        var (url, text) = await svc.ProcessAsync(file);
        Assert.StartsWith("https://fake.example/resumes/", url);
        Assert.Contains("ProcessTest", text);
    }
}
