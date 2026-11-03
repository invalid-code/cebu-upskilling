using CebuUpskilling.Backend.Data;
using CebuUpskilling.Backend.DTOs;
using CebuUpskilling.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace CebuUpskilling.Backend.Services;

public interface ICertificateService
{
    /// <summary>
    /// Issues a certificate when the learner has completed a course that is
    /// opted in to certificates. Idempotent: an existing certificate is returned.
    /// </summary>
    Task<CertificateDto?> IssueIfEligibleAsync(Guid learnerId, Guid courseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Backfills certificates for every learner who has already completed the
    /// course. Used when a provider enables certificates on an existing course.
    /// </summary>
    Task<int> IssueForCompletedLearnersAsync(Guid courseId, CancellationToken cancellationToken = default);

    Task<List<CertificateDto>> GetForUserAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<CertificateDto?> GetForUserAsync(Guid userId, Guid certificateId, CancellationToken cancellationToken = default);

    Task<int> CountForUserAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<CertificateDto?> VerifyAsync(string serialNumber, CancellationToken cancellationToken = default);
}

public class CertificateService : ICertificateService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<CertificateService> _logger;

    public CertificateService(ApplicationDbContext db, ILogger<CertificateService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<CertificateDto?> IssueIfEligibleAsync(Guid learnerId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var course = await _db.Courses.AsNoTracking()
            .Include(c => c.Company)
            .SingleOrDefaultAsync(c => c.CourseId == courseId, cancellationToken);
        if (course is null || !course.IssuesCertificate) return null;

        var completed = await _db.LearnerStudyCourses.AsNoTracking()
            .AnyAsync(e => e.LearnerId == learnerId
                           && e.CourseId == courseId
                           && e.LastTotalProgressPercent >= 100, cancellationToken);
        if (!completed) return null;

        var existing = await _db.CourseCertificates.AsNoTracking()
            .SingleOrDefaultAsync(c => c.LearnerId == learnerId && c.CourseId == courseId, cancellationToken);
        if (existing is not null) return Map(existing);

        var learner = await _db.Learners.AsNoTracking()
            .Include(l => l.User)
            .SingleOrDefaultAsync(l => l.LearnerId == learnerId, cancellationToken);
        if (learner is null) return null;

        var certificate = new CourseCertificate
        {
            CertificateId = Guid.NewGuid(),
            CourseId = courseId,
            LearnerId = learnerId,
            SerialNumber = NewSerialNumber(DateTime.UtcNow),
            RecipientName = FullName(learner.User),
            CourseName = course.Name,
            ProviderName = await ResolveProviderNameAsync(course, cancellationToken),
            IssuedAt = DateTime.UtcNow,
        };

        _db.CourseCertificates.Add(certificate);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation(
                "Issued certificate {SerialNumber} to learner {LearnerId} for course {CourseId}",
                certificate.SerialNumber, learnerId, courseId);
            return Map(certificate);
        }
        catch (DbUpdateException ex)
        {
            // Lost a concurrent issue race. The unique (LearnerId, CourseId)
            // index rejected the duplicate, so return the credential that won.
            _db.Entry(certificate).State = EntityState.Detached;
            _logger.LogInformation(ex,
                "Certificate already issued for learner {LearnerId} in course {CourseId}; returning existing",
                learnerId, courseId);
            var winner = await _db.CourseCertificates.AsNoTracking()
                .SingleOrDefaultAsync(c => c.LearnerId == learnerId && c.CourseId == courseId, cancellationToken);
            return winner is null ? null : Map(winner);
        }
    }

    public async Task<int> IssueForCompletedLearnersAsync(Guid courseId, CancellationToken cancellationToken = default)
    {
        var course = await _db.Courses.AsNoTracking()
            .Include(c => c.Company)
            .SingleOrDefaultAsync(c => c.CourseId == courseId, cancellationToken);
        if (course is null || !course.IssuesCertificate) return 0;

        var completedLearnerIds = await _db.LearnerStudyCourses.AsNoTracking()
            .Where(e => e.CourseId == courseId && e.LastTotalProgressPercent >= 100)
            .Select(e => e.LearnerId)
            .ToListAsync(cancellationToken);
        if (completedLearnerIds.Count == 0) return 0;

        var existingLearnerIds = await _db.CourseCertificates.AsNoTracking()
            .Where(c => c.CourseId == courseId && completedLearnerIds.Contains(c.LearnerId))
            .Select(c => c.LearnerId)
            .ToListAsync(cancellationToken);
        var missing = completedLearnerIds.Except(existingLearnerIds).ToList();
        if (missing.Count == 0) return 0;

        var learners = await _db.Learners.AsNoTracking()
            .Include(l => l.User)
            .Where(l => missing.Contains(l.LearnerId))
            .ToListAsync(cancellationToken);
        var providerName = await ResolveProviderNameAsync(course, cancellationToken);

        var issued = 0;
        foreach (var learner in learners)
        {
            var certificate = new CourseCertificate
            {
                CertificateId = Guid.NewGuid(),
                CourseId = courseId,
                LearnerId = learner.LearnerId,
                SerialNumber = NewSerialNumber(DateTime.UtcNow),
                RecipientName = FullName(learner.User),
                CourseName = course.Name,
                ProviderName = providerName,
                IssuedAt = DateTime.UtcNow,
            };
            _db.CourseCertificates.Add(certificate);
            try
            {
                await _db.SaveChangesAsync(cancellationToken);
                issued++;
            }
            catch (DbUpdateException ex)
            {
                // Another request may have issued the same credential first.
                _db.Entry(certificate).State = EntityState.Detached;
                _logger.LogInformation(ex,
                    "Skipping certificate backfill for learner {LearnerId} in course {CourseId}; already issued",
                    learner.LearnerId, courseId);
            }
        }

        if (issued > 0)
        {
            _logger.LogInformation(
                "Issued {Issued} certificate(s) to already-completed learners in course {CourseId}",
                issued, courseId);
        }
        return issued;
    }

    public async Task<List<CertificateDto>> GetForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var learnerId = await _db.Learners.AsNoTracking()
            .Where(l => l.UserId == userId)
            .Select(l => (Guid?)l.LearnerId)
            .SingleOrDefaultAsync(cancellationToken);
        if (learnerId is null) return [];

        return await _db.CourseCertificates.AsNoTracking()
            .Where(c => c.LearnerId == learnerId.Value)
            .OrderByDescending(c => c.IssuedAt)
            .Select(c => new CertificateDto(
                c.CertificateId,
                c.CourseId,
                c.SerialNumber,
                c.RecipientName,
                c.CourseName,
                c.ProviderName,
                c.IssuedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<CertificateDto?> GetForUserAsync(Guid userId, Guid certificateId, CancellationToken cancellationToken = default)
    {
        return await _db.CourseCertificates.AsNoTracking()
            .Where(c => c.CertificateId == certificateId && c.Learner.UserId == userId)
            .Select(c => new CertificateDto(
                c.CertificateId,
                c.CourseId,
                c.SerialNumber,
                c.RecipientName,
                c.CourseName,
                c.ProviderName,
                c.IssuedAt))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<int> CountForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _db.CourseCertificates.AsNoTracking()
            .CountAsync(c => c.Learner.UserId == userId, cancellationToken);
    }

    public async Task<CertificateDto?> VerifyAsync(string serialNumber, CancellationToken cancellationToken = default)
    {
        var normalized = serialNumber?.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalized)) return null;

        return await _db.CourseCertificates.AsNoTracking()
            .Where(c => c.SerialNumber == normalized)
            .Select(c => new CertificateDto(
                c.CertificateId,
                c.CourseId,
                c.SerialNumber,
                c.RecipientName,
                c.CourseName,
                c.ProviderName,
                c.IssuedAt))
            .SingleOrDefaultAsync(cancellationToken);
    }

    private async Task<string> ResolveProviderNameAsync(Course course, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(course.Company?.Name)) return course.Company.Name;

        if (Guid.TryParse(course.CreatedBy, out var creatorId))
        {
            var creator = await _db.Users.AsNoTracking()
                .Where(u => u.UserId == creatorId)
                .Select(u => new { u.FirstName, u.LastName })
                .SingleOrDefaultAsync(cancellationToken);
            if (creator is not null)
            {
                var name = $"{creator.FirstName} {creator.LastName}".Trim();
                if (!string.IsNullOrWhiteSpace(name)) return name;
            }
        }

        return "CebuUpskilling";
    }

    private static string FullName(AppUser user)
    {
        var name = $"{user.FirstName} {user.LastName}".Trim();
        return string.IsNullOrWhiteSpace(name) ? user.EmailAddress : name;
    }

    private static string NewSerialNumber(DateTime issuedAt) =>
        $"CU-{issuedAt:yyyy}-{Guid.NewGuid():N}"[..20].ToUpperInvariant();

    private static CertificateDto Map(CourseCertificate c) => new(
        c.CertificateId,
        c.CourseId,
        c.SerialNumber,
        c.RecipientName,
        c.CourseName,
        c.ProviderName,
        c.IssuedAt);
}
