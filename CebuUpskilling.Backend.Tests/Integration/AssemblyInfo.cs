using Xunit;

// Integration tests share a single PostgreSQL test database, so they must run
// one at a time. Each test resets the database before it runs.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
