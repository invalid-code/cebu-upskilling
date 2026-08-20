using CebuUpskilling.Backend.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace CebuUpskilling.Backend.Tests;

public class TokenRevocationStoreTests
{
    private static InMemoryTokenRevocationStore CreateStore() =>
        new(NullLogger<InMemoryTokenRevocationStore>.Instance);

    [Fact]
    public void IsRevoked_UnknownJti_ReturnsFalse()
    {
        var store = CreateStore();

        Assert.False(store.IsRevoked("unknown-jti"));
    }

    [Fact]
    public void IsRevoked_AfterRevoke_ReturnsTrueUntilExpiry()
    {
        var store = CreateStore();

        store.Revoke("revoked-jti", DateTime.UtcNow.AddHours(1));

        Assert.True(store.IsRevoked("revoked-jti"));
    }

    [Fact]
    public void IsRevoked_AfterExpiry_ReturnsFalseAndPurges()
    {
        var store = CreateStore();

        store.Revoke("expired-jti", DateTime.UtcNow.AddHours(-1));

        Assert.False(store.IsRevoked("expired-jti"));

        // Once purged, a second lookup must not resurrect the entry.
        Assert.False(store.IsRevoked("expired-jti"));
    }
}