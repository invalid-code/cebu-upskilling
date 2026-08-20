using System.Collections.Concurrent;

namespace CebuUpskilling.Backend.Services;

/// <summary>
/// Tracks revoked JWT identifiers (JTIs) so that logged-out tokens stop working
/// even though JWTs are otherwise stateless. An in-memory store is sufficient for a
/// single-instance deployment; replace with a distributed cache for multi-instance.
/// </summary>
public interface ITokenRevocationStore
{
    void Revoke(string jti, DateTime expiryUtc);
    bool IsRevoked(string jti);
}

public class InMemoryTokenRevocationStore : ITokenRevocationStore
{
    private readonly ConcurrentDictionary<string, DateTime> _revoked = new();
    private readonly ILogger<InMemoryTokenRevocationStore> _logger;

    public InMemoryTokenRevocationStore(ILogger<InMemoryTokenRevocationStore> logger)
    {
        _logger = logger;
    }

    public void Revoke(string jti, DateTime expiryUtc)
    {
        _revoked[jti] = expiryUtc;
        _logger.LogInformation("Revoked token jti {Jti} until {ExpiryUtc}", jti, expiryUtc);
    }

    public bool IsRevoked(string jti)
    {
        if (_revoked.TryGetValue(jti, out var expiry))
        {
            if (expiry > DateTime.UtcNow)
            {
                return true;
            }

            _revoked.TryRemove(jti, out _);
            _logger.LogDebug("Purged expired revoked token jti {Jti}", jti);
        }

        return false;
    }
}
