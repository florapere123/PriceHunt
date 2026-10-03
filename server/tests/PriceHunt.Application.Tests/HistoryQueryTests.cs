using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PriceHunt.Application.Options;
using PriceHunt.Application.Tests.TestData;
using PriceHunt.Domain;
using PriceHunt.Domain.Entities;
using PriceHunt.Domain.ValueObjects;
using PriceHunt.Infrastructure.Persistence;
using Xunit;

namespace PriceHunt.Application.Tests;

/// <summary>
/// Unit tests verifying row-level filtering, pagination, and sorting for search history.
/// </summary>
public sealed class HistoryQueryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PriceHuntDbContext _dbContext;
    private readonly HistoryQuery _query;

    /// <summary>Creates an in-memory SQLite database and seeds history fixture data.</summary>
    public HistoryQueryTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<PriceHuntDbContext>()
            .UseSqlite(_connection)
            .Options;

        _dbContext = new PriceHuntDbContext(options);
        _dbContext.Database.EnsureCreated();
        SearchStatusSeeder.SeedAsync(_dbContext).GetAwaiter().GetResult();
        _query = new HistoryQuery(_dbContext, Microsoft.Extensions.Options.Options.Create(new SearchOptions()));

        Seed();
    }

    /// <summary>
    /// Verifies each sortable column orders the flattened (search, supplier) rows directly,
    /// so rows from the same search can be interleaved with rows from other searches.
    /// </summary>
    /// <param name="sortBy">Column key passed to the query.</param>
    /// <param name="sortDir">Sort direction, "asc" or "desc".</param>
    /// <param name="expected">Expected rows formatted as "ToLocation:SupplierName".</param>
    [Theory]
    [InlineData("date", "desc", new[] { "Paris:Supplier A", "Paris:Supplier D", "Berlin:Supplier B", "Rome:Supplier C" })]
    [InlineData("date", "asc", new[] { "Rome:Supplier C", "Berlin:Supplier B", "Paris:Supplier A", "Paris:Supplier D" })]
    [InlineData("route", "asc", new[] { "Berlin:Supplier B", "Paris:Supplier A", "Paris:Supplier D", "Rome:Supplier C" })]
    [InlineData("route", "desc", new[] { "Rome:Supplier C", "Paris:Supplier A", "Paris:Supplier D", "Berlin:Supplier B" })]
    [InlineData("supplier", "asc", new[] { "Paris:Supplier A", "Berlin:Supplier B", "Rome:Supplier C", "Paris:Supplier D" })]
    [InlineData("supplier", "desc", new[] { "Paris:Supplier D", "Rome:Supplier C", "Berlin:Supplier B", "Paris:Supplier A" })]
    [InlineData("price", "asc", new[] { "Paris:Supplier D", "Rome:Supplier C", "Paris:Supplier A", "Berlin:Supplier B" })]
    [InlineData("price", "desc", new[] { "Berlin:Supplier B", "Paris:Supplier A", "Rome:Supplier C", "Paris:Supplier D" })]
    [InlineData("responseTime", "asc", new[] { "Rome:Supplier C", "Paris:Supplier A", "Berlin:Supplier B", "Paris:Supplier D" })]
    [InlineData("responseTime", "desc", new[] { "Paris:Supplier D", "Berlin:Supplier B", "Paris:Supplier A", "Rome:Supplier C" })]
    public async Task GetHistoryAsync_SortingByColumn_OrdersFlattenedRows(string sortBy, string sortDir, string[] expected)
    {
        var result = await _query.GetHistoryAsync(new HistoryFilter { SortBy = sortBy, SortDir = sortDir }, CancellationToken.None);

        Assert.Equal(expected, result.Items.Select(r => $"{r.ToLocation}:{r.SupplierName}").ToArray());
        Assert.Equal(4, result.TotalCount);
    }

    /// <summary>Verifies pagination counts and slices flattened rows rather than searches.</summary>
    [Fact]
    public async Task GetHistoryAsync_Paging_SkipsAndTakesFlattenedRows()
    {
        var result = await _query.GetHistoryAsync(
            new HistoryFilter { SortBy = "price", SortDir = "asc", Page = 2, PageSize = 3 },
            CancellationToken.None);

        Assert.Equal(4, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        var row = Assert.Single(result.Items);
        Assert.Equal("Supplier B", row.SupplierName);
    }

    /// <summary>Verifies a single supplier filter keeps only matching rows, not whole searches.</summary>
    [Fact]
    public async Task GetHistoryAsync_SupplierFilter_ReturnsOnlyMatchingRows()
    {
        var result = await _query.GetHistoryAsync(new HistoryFilter { Suppliers = ["Supplier D"] }, CancellationToken.None);

        var row = Assert.Single(result.Items);
        Assert.Equal("Paris", row.ToLocation);
        Assert.Equal(100m, row.Price);
    }

    /// <summary>Verifies filtering by multiple suppliers returns only rows for those suppliers.</summary>
    [Fact]
    public async Task GetHistoryAsync_MultipleSuppliersFilter_ReturnsOnlyMatchingRows()
    {
        var result = await _query.GetHistoryAsync(
            new HistoryFilter { Suppliers = ["Supplier A", "Supplier C"] },
            CancellationToken.None);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(["Paris:Supplier A", "Rome:Supplier C"], result.Items.Select(r => $"{r.ToLocation}:{r.SupplierName}").ToArray());
    }

    /// <summary>Verifies a search with no persisted responses still yields one row with null supplier fields.</summary>
    [Fact]
    public async Task GetHistoryAsync_SearchWithoutResponses_ReturnsRowWithNullSupplierFields()
    {
        _dbContext.SearchRecords.Add(new SearchRecord
        {
            Id = Guid.NewGuid(),
            FromLocation = "London",
            ToLocation = "Madrid",
            FromDate = new DateOnly(2026, 4, 1),
            ToDate = new DateOnly(2026, 4, 8),
            SelectedSuppliers = "Supplier E",
            StatusCode = SearchStatus.TimedOut.ToString(),
            Timestamp = new DateTimeOffset(2026, 1, 4, 12, 0, 0, TimeSpan.Zero),
            CreatedAt = UtcTimestamps.FormatCreatedAt(new DateTimeOffset(2026, 1, 4, 12, 0, 0, TimeSpan.Zero)),
        });
        await _dbContext.SaveChangesAsync();

        var result = await _query.GetHistoryAsync(new HistoryFilter { Status = "TimedOut" }, CancellationToken.None);

        var row = Assert.Single(result.Items);
        Assert.Equal("Madrid", row.ToLocation);
        Assert.Null(row.SupplierName);
        Assert.Null(row.Price);
        Assert.Null(row.ResponseTimeMs);
        Assert.Null(row.IsSuccess);
        Assert.Equal(SupplierOutcome.Timeout, row.SupplierOutcome);
        Assert.Equal(SearchStatus.TimedOut.ToString(), row.SearchStatus.Code);
        Assert.Equal("Timed out", row.SearchStatus.Name);
        Assert.Equal("2026-01-04T12:00:00Z", row.CreatedAt);
        Assert.Equal(0, row.RespondedCount);
        Assert.Equal(1, row.TotalSuppliersCount);
    }

    /// <summary>
    /// Verifies successful supplier responses keep a success outcome when the parent search timed out.
    /// </summary>
    [Fact]
    public async Task GetHistoryAsync_TimedOutSearchWithPartialResponses_PreservesPerSupplierOutcomes()
    {
        var searchId = Guid.NewGuid();
        var createdAt = UtcTimestamps.FormatCreatedAt(new DateTimeOffset(2026, 1, 5, 12, 0, 0, TimeSpan.Zero));

        _dbContext.SearchRecords.Add(new SearchRecord
        {
            Id = searchId,
            FromLocation = "London",
            ToLocation = "Paris",
            FromDate = new DateOnly(2026, 5, 1),
            ToDate = new DateOnly(2026, 5, 8),
            SelectedSuppliers = "Supplier A,Supplier G",
            StatusCode = SearchStatus.TimedOut.ToString(),
            Timestamp = new DateTimeOffset(2026, 1, 5, 12, 0, 0, TimeSpan.Zero),
            CreatedAt = createdAt,
            Responses =
            [
                new SupplierResponse
                {
                    Id = Guid.NewGuid(),
                    SearchRecordId = searchId,
                    SupplierName = "Supplier A",
                    Price = 220m,
                    ResponseTimeMs = 400,
                    IsSuccess = true,
                    Timestamp = new DateTimeOffset(2026, 1, 5, 12, 0, 1, TimeSpan.Zero),
                },
            ],
        });
        await _dbContext.SaveChangesAsync();

        var result = await _query.GetHistoryAsync(new HistoryFilter { Status = "TimedOut" }, CancellationToken.None);

        Assert.Equal(2, result.TotalCount);

        var supplierA = Assert.Single(result.Items, r => r.SupplierName == "Supplier A");
        Assert.True(supplierA.IsSuccess);
        Assert.Equal(SupplierOutcome.Success, supplierA.SupplierOutcome);
        Assert.Equal(SearchStatus.TimedOut.ToString(), supplierA.SearchStatus.Code);
        Assert.Equal(1, supplierA.RespondedCount);
        Assert.Equal(2, supplierA.TotalSuppliersCount);

        var supplierG = Assert.Single(result.Items, r => r.SupplierName == "Supplier G");
        Assert.Null(supplierG.IsSuccess);
        Assert.Equal(SupplierOutcome.Timeout, supplierG.SupplierOutcome);
        Assert.Equal(SearchStatus.TimedOut.ToString(), supplierG.SearchStatus.Code);
        Assert.Equal(1, supplierG.RespondedCount);
        Assert.Equal(2, supplierG.TotalSuppliersCount);
    }

    /// <summary>Verifies completed searches report full supplier response counts on every flattened row.</summary>
    [Fact]
    public async Task GetHistoryAsync_CompletedSearch_ReportsFullResponseCounts()
    {
        var result = await _query.GetHistoryAsync(new HistoryFilter { Suppliers = ["Supplier A"] }, CancellationToken.None);

        var row = Assert.Single(result.Items);
        Assert.Equal(SearchStatus.Completed.ToString(), row.SearchStatus.Code);
        Assert.Equal(2, row.RespondedCount);
        Assert.Equal(2, row.TotalSuppliersCount);
    }

    /// <summary>Loads search records from JSON and persists them with response foreign keys.</summary>
    private void Seed()
    {
        var records = TestFixtureLoader.LoadJson<List<SearchRecord>>("TestData/history-records.json");

        foreach (var record in records)
        {
            foreach (var response in record.Responses)
            {
                response.SearchRecordId = record.Id;
            }
        }

        _dbContext.SearchRecords.AddRange(records);
        _dbContext.SaveChanges();
    }

    /// <summary>Releases database context, closes connection, and suppresses finalization.</summary>
    public void Dispose()
    {
        _dbContext.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }
}
