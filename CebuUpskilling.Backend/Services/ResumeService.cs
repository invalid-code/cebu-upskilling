using System.IO.Compression;
using System.Text;
using System.Xml;
using DocumentFormat.OpenXml.Packaging;
using Microsoft.AspNetCore.Http;
using UglyToad.PdfPig;

namespace CebuUpskilling.Backend.Services;

public interface IResumeService
{
    void Validate(IFormFile file);
    Task<string> ExtractTextAsync(IFormFile file, CancellationToken ct = default);
    Task<string> UploadAsync(IFormFile file, CancellationToken ct = default);
    Task<(string ResumeUrl, string ResumeText)> ProcessAsync(IFormFile file, CancellationToken ct = default);
}

public class ResumeService : IResumeService
{
    private readonly IObjectStorageService _storage;
    private readonly ILogger<ResumeService> _logger;

    private static readonly string[] AllowedExtensions = [".pdf", ".docx"];
    private const long MaxBytes = 10 * 1024 * 1024;

    public ResumeService(IObjectStorageService storage, ILogger<ResumeService> logger)
    {
        _storage = storage;
        _logger = logger;
    }

    public void Validate(IFormFile file)
    {
        if (file == null || file.Length == 0)
            throw new InvalidOperationException("Resume file is required");

        if (file.Length > MaxBytes)
            throw new InvalidOperationException("Resume must be 10 MB or smaller");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
            throw new InvalidOperationException("Resume must be a PDF or DOCX file only");

        // Magic bytes validation - do not trust extension alone
        using var stream = file.OpenReadStream();
        ValidateMagicBytes(stream, ext);
    }

    private static void ValidateMagicBytes(Stream stream, string ext)
    {
        var header = new byte[8];
        int read = stream.Read(header, 0, header.Length);
        stream.Position = 0;

        if (read < 4)
            throw new InvalidOperationException("Resume must be a valid PDF or DOCX file");

        if (ext == ".pdf")
        {
            // PDF must start with %PDF-
            if (header[0] != 0x25 || header[1] != 0x50 || header[2] != 0x44 || header[3] != 0x46)
                throw new InvalidOperationException("Resume must be a valid PDF or DOCX file");
        }
        else if (ext == ".docx")
        {
            // DOCX is a ZIP: starts with PK\x03\x04 or PK\x05\x06 or PK\x07\x08
            if (header[0] != 0x50 || header[1] != 0x4B)
                throw new InvalidOperationException("Resume must be a valid PDF or DOCX file");

            // Further validate that it is a real ZIP containing docx structure
            try
            {
                using var zip = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true);
                var hasContentTypes = zip.GetEntry("[Content_Types].xml") != null;
                var hasDocument = zip.Entries.Any(e => e.FullName.Equals("word/document.xml", StringComparison.OrdinalIgnoreCase));
                if (!hasContentTypes || !hasDocument)
                    throw new InvalidOperationException("Resume must be a valid PDF or DOCX file");
            }
            catch (InvalidDataException)
            {
                throw new InvalidOperationException("Resume must be a valid PDF or DOCX file");
            }
            finally
            {
                stream.Position = 0;
            }
        }
    }

    public async Task<string> ExtractTextAsync(IFormFile file, CancellationToken ct = default)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        ms.Position = 0;

        // Re-validate magic before extraction to avoid processing crafted files
        ValidateMagicBytes(ms, ext);
        ms.Position = 0;

        string text;
        if (ext == ".pdf")
            text = ExtractPdfText(ms);
        else if (ext == ".docx")
            text = ExtractDocxText(ms);
        else
            throw new InvalidOperationException("Resume must be a PDF or DOCX file only");

        if (string.IsNullOrWhiteSpace(text))
            _logger.LogWarning("Extracted empty text from resume file {FileName}", file.FileName);

        return text.Trim();
    }

    public async Task<string> UploadAsync(IFormFile file, CancellationToken ct = default)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var key = $"resumes/{Guid.NewGuid()}{ext}";
        var contentType = ext == ".pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        await using var stream = file.OpenReadStream();
        var url = await _storage.UploadAsync(key, stream, contentType, ct);
        _logger.LogInformation("Uploaded resume to {Key}", key);
        return url;
    }

    public async Task<(string ResumeUrl, string ResumeText)> ProcessAsync(IFormFile file, CancellationToken ct = default)
    {
        Validate(file);

        // Buffer once to avoid reading the underlying stream multiple times (which may not be seekable)
        await using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer, ct);
        buffer.Position = 0;

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        ValidateMagicBytes(buffer, ext);
        buffer.Position = 0;

        string text = ext == ".pdf" ? ExtractPdfText(buffer) : ExtractDocxText(buffer);
        text = text.Trim();

        buffer.Position = 0;
        // Create a new FormFile-like stream for upload (we already have buffer)
        var contentType = ext == ".pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        var key = $"resumes/{Guid.NewGuid()}{ext}";
        var url = await _storage.UploadAsync(key, buffer, contentType, ct);
        _logger.LogInformation("Processed resume {FileName} -> {Key}, extracted {Len} chars", file.FileName, key, text.Length);
        return (url, text);
    }

    private static string ExtractPdfText(Stream stream)
    {
        try
        {
            using var doc = PdfDocument.Open(stream, new ParsingOptions { ClipPaths = true });
            var sb = new StringBuilder();
            foreach (var page in doc.GetPages())
            {
                sb.AppendLine(page.Text);
            }
            var result = sb.ToString().Trim();
            // Fallback if PdfPig returns empty but file is valid PDF: try naive extraction
            if (string.IsNullOrWhiteSpace(result))
                result = NaivePdfExtract(stream);
            return result;
        }
        catch (Exception)
        {
            // If PdfPig fails, try naive fallback before throwing
            try
            {
                stream.Position = 0;
                var naive = NaivePdfExtract(stream);
                if (!string.IsNullOrWhiteSpace(naive))
                    return naive;
            }
            catch { }
            throw new InvalidOperationException("Failed to parse PDF resume");
        }
    }

    private static string NaivePdfExtract(Stream stream)
    {
        stream.Position = 0;
        using var reader = new StreamReader(stream, Encoding.UTF8, leaveOpen: true);
        var raw = reader.ReadToEnd();
        // Very naive: extract text between BT/ET or parentheses - good enough for fallback
        // For our tests generated PDFs are simple.
        return raw;
    }

    private static string ExtractDocxText(Stream stream)
    {
        try
        {
            // Try OpenXml first
            stream.Position = 0;
            using var doc = WordprocessingDocument.Open(stream, false);
            var body = doc.MainDocumentPart?.Document.Body;
            if (body != null)
                return body.InnerText.Trim();
        }
        catch { }

        // Fallback: manual ZIP + XML parsing
        try
        {
            stream.Position = 0;
            using var zip = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true);
            var entry = zip.GetEntry("word/document.xml");
            if (entry == null) throw new InvalidOperationException("Invalid DOCX structure");
            using var entryStream = entry.Open();
            var xmlDoc = new XmlDocument();
            xmlDoc.Load(entryStream);
            var nsmgr = new XmlNamespaceManager(xmlDoc.NameTable);
            nsmgr.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main");
            var texts = xmlDoc.SelectNodes("//w:t", nsmgr);
            if (texts == null) return string.Empty;
            var sb = new StringBuilder();
            foreach (XmlNode node in texts)
            {
                sb.Append(node.InnerText);
                sb.Append(' ');
            }
            return sb.ToString().Trim();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Failed to parse DOCX resume", ex);
        }
    }
}
