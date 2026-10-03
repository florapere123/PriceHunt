using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PriceHunt.Application.Options;
using PriceHunt.Application.Search;
using PriceHunt.Application.Tests.TestData;
using PriceHunt.Domain.Entities;
using PriceHunt.Domain.Interfaces;
using PriceHunt.Domain.ValueObjects;
using Xunit;

namespace PriceHunt.Application.Tests;

public class SearchOrchestratorTests
{
    private static readonly SearchRequest SampleRequest =
        TestFixtureLoader.LoadJson<SearchRequestsFixture>("TestData/search-requests.json").Valid.ToSearchRequest();

    /// <summary>
    /// Verifies a failing supplier does not stop other supplier responses from streaming.
    /// </summary>
    [Fact]
    public async Task RunAsync_WhenSupplierThrows_ContinuesStreamingOtherSuppliers()
    {
        var (repo, _, _) = CreateRepositoryMock();
        var orchestrator = CreateOrchestrator(
            [
                new DelegateSupplier("Fast", (_, _) => Task.FromResult(Success("Fast", 100m))),
                new DelegateSupplier("Bad", (_, _) => throw new InvalidOperationException("supplier down")),
                new DelegateSupplier("Slow", async (_, ct) =>
                {
                    await Task.Delay(50, ct);
                    return Success("Slow", 200m);
                }),
            ],
            repo.Object,
            searchTimeoutSeconds: 2);

        var results = await CollectAsync(orchestrator.RunAsync(SampleRequest, CancellationToken.None));

        Assert.Equal(3, results.Count);
        Assert.Contains(results, r => r.SupplierName == "Fast" && r.IsSuccess);
        Assert.Contains(results, r => r.SupplierName == "Slow" && r.IsSuccess);
        Assert.Contains(results, r => r.SupplierName == "Bad" && !r.IsSuccess);
    }

    /// <summary>
    /// Verifies the orchestrator times out when a supplier never completes.
    /// </summary>
    [Fact]
    public async Task RunAsync_WhenSupplierNeverResponds_TimesOutGracefully()
    {
        var (repo, getStatus, getResponses) = CreateRepositoryMock();
        var hangTcs = new TaskCompletionSource<SupplierResponse>(TaskCreationOptions.RunContinuationsAsynchronously);
        var orchestrator = CreateOrchestrator(
            [
                new DelegateSupplier("Fast", (_, _) => Task.FromResult(Success("Fast", 150m))),
                new DelegateSupplier("Hang", (_, _) => hangTcs.Task),
            ],
            repo.Object,
            searchTimeoutSeconds: 1);

        var request = SampleRequest with { SelectedSuppliers = ["Fast", "Hang"] };
        var results = await CollectAsync(orchestrator.RunAsync(request, CancellationToken.None));

        Assert.Single(results);
        Assert.Equal("Fast", results[0].SupplierName);
        Assert.Equal(SearchStatus.TimedOut, getStatus());
        Assert.Contains(getResponses(), r => r.SupplierName == "Fast" && r.IsSuccess);
    }

    /// <summary>
    /// Verifies mid-stream cancellation sets the final search status to Cancelled.
    /// </summary>
    [Fact]
    public async Task RunAsync_WhenCancellationTokenCancelled_SetsStatusToCancelled()
    {
        var (repo, getStatus, _) = CreateRepositoryMock();
        using var cts = new CancellationTokenSource();
        var orchestrator = CreateOrchestrator(
            [
                new DelegateSupplier("Fast", async (_, ct) =>
                {
                    await Task.Delay(30, ct);
                    return Success("Fast", 99m);
                }),
                new DelegateSupplier("Slow", async (_, ct) =>
                {
                    await Task.Delay(500, ct);
                    return Success("Slow", 199m);
                }),
            ],
            repo.Object,
            searchTimeoutSeconds: 2);

        var results = new List<SupplierResponse>();
        await foreach (var response in orchestrator.RunAsync(SampleRequest, cts.Token))
        {
            results.Add(response);
            await cts.CancelAsync();
            break;
        }

        Assert.NotEmpty(results);
        Assert.Equal(SearchStatus.Cancelled, getStatus());
    }

    /// <summary>
    /// Builds a SearchOrchestrator with the given suppliers and a configurable timeout.
    /// </summary>
    /// <param name="suppliers">Test supplier doubles to query.</param>
    /// <param name="repository">Repository receiving persisted search state.</param>
    /// <param name="searchTimeoutSeconds">Hard search timeout applied by the orchestrator.</param>
    /// <returns>A configured orchestrator instance.</returns>
    private static SearchOrchestrator CreateOrchestrator(
        IEnumerable<ISupplier> suppliers,
        ISearchRepository repository,
        int searchTimeoutSeconds) =>
        new(
            suppliers,
            repository,
            NullLogger<SearchOrchestrator>.Instance,
            Microsoft.Extensions.Options.Options.Create(new SearchOptions { SearchTimeoutSeconds = searchTimeoutSeconds }));

    /// <summary>Creates a mocked repository that captures the final persisted search status.</summary>
    private static (Mock<ISearchRepository> Repo, Func<SearchStatus?> GetStatus, Func<IReadOnlyList<SupplierResponse>> GetResponses) CreateRepositoryMock()
    {
        SearchStatus? finalStatus = null;
        var responses = new List<SupplierResponse>();
        var repo = new Mock<ISearchRepository>();
        repo.Setup(r => r.AddSearchAsync(It.IsAny<SearchRecord>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        repo.Setup(r => r.AddSupplierResponseAsync(It.IsAny<SupplierResponse>(), It.IsAny<CancellationToken>()))
            .Callback<SupplierResponse, CancellationToken>((response, _) => responses.Add(response))
            .Returns(Task.CompletedTask);
        repo.Setup(r => r.UpdateStatusAsync(It.IsAny<Guid>(), It.IsAny<SearchStatus>(), It.IsAny<CancellationToken>()))
            .Callback<Guid, SearchStatus, CancellationToken>((_, status, _) => finalStatus = status)
            .Returns(Task.CompletedTask);
        return (repo, () => finalStatus, () => responses);
    }

    /// <summary>Drains an orchestrator response stream into a list.</summary>
    private static async Task<List<SupplierResponse>> CollectAsync(
        IAsyncEnumerable<SupplierResponse> stream)
    {
        var results = new List<SupplierResponse>();
        await foreach (var item in stream)
        {
            results.Add(item);
        }

        return results;
    }

    /// <summary>
    /// Creates a successful supplier response for test doubles.
    /// </summary>
    /// <param name="name">Supplier name on the response.</param>
    /// <param name="price">Quoted price.</param>
    /// <returns>A successful supplier response.</returns>
    private static SupplierResponse Success(string name, decimal price) => new()
    {
        Id = Guid.NewGuid(),
        SupplierName = name,
        Price = price,
        ResponseTimeMs = 10,
        IsSuccess = true,
        Timestamp = DateTimeOffset.UtcNow,
    };

    private sealed class DelegateSupplier(string name, Func<SearchRequest, CancellationToken, Task<SupplierResponse>> handler)
        : ISupplier
    {
        public string Name => name;

        public Task<SupplierResponse> GetQuoteAsync(SearchRequest request, CancellationToken ct) =>
            handler(request, ct);
    }
}