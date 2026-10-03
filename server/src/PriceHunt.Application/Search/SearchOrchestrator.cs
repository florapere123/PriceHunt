using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PriceHunt.Application.Options;
using PriceHunt.Domain;
using PriceHunt.Domain.Entities;
using PriceHunt.Domain.Interfaces;
using PriceHunt.Domain.ValueObjects;

namespace PriceHunt.Application.Search;

/// <summary>
/// Orchestrates concurrent supplier queries, manages search timeouts, 
/// persists real-time search state, and streams progressive results via Channels.
/// </summary>
public sealed class SearchOrchestrator(
    IEnumerable<ISupplier> suppliers,
    ISearchRepository repository,
    ILogger<SearchOrchestrator> logger,
    IOptions<SearchOptions> options)
{
    private readonly TimeSpan _searchTimeout = TimeSpan.FromSeconds(options.Value.SearchTimeoutSeconds);

    /// <summary>
    /// Executes a progressive search across selected suppliers and streams responses as they arrive.
    /// Handles timeout cutoff and client cancellation gracefully.
    /// </summary>
    /// <param name="request">The search criteria including locations, dates, and selected suppliers.</param>
    /// <param name="callerToken">Cancellation token linked to client disconnection or search abortion.</param>
    /// <returns>An async stream of supplier responses consumed by the NDJSON endpoint.</returns>
    public async IAsyncEnumerable<SupplierResponse> RunAsync(
        SearchRequest request,
        [EnumeratorCancellation] CancellationToken callerToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var selected = SelectSuppliers(request.SelectedSuppliers);

        var startedAt = DateTimeOffset.UtcNow;
        var record = new SearchRecord
        {
            Id = Guid.NewGuid(),
            FromLocation = request.FromLocation.Trim(),
            ToLocation = request.ToLocation.Trim(),
            FromDate = request.FromDate,
            ToDate = request.ToDate,
            SelectedSuppliers = string.Join(",", selected.Select(s => s.Name)),
            StatusCode = SearchStatus.Running.ToString(),
            Timestamp = startedAt,
            CreatedAt = UtcTimestamps.FormatCreatedAt(startedAt),
        };

        logger.LogInformation(
            "Search started from {FromLocation} to {ToLocation} ({FromDate} – {ToDate}, {SupplierCount} suppliers).",
            record.FromLocation,
            record.ToLocation,
            record.FromDate,
            record.ToDate,
            selected.Count);

        await repository.AddSearchAsync(record, callerToken);

        // Link the client cancellation token with the hard search timeout
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(callerToken);
        cts.CancelAfter(_searchTimeout);

        // In-memory producer-consumer channel: multi-supplier writers, single-consumer reader
        var channel = Channel.CreateUnbounded<SupplierResponse>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });

        StartSuppliers(selected, request, record.Id, channel.Writer, cts.Token);

        var finalStatus = SearchStatus.Cancelled;
        try
        {
            while (true)
            {
                // Drain buffered items before waiting — WaitToReadAsync throws on a cancelled token even when data is pending.
                while (channel.Reader.TryRead(out var response))
                {
                    yield return response;
                    await repository.AddSupplierResponseAsync(response, CancellationToken.None);
                }

                bool hasMore;
                try
                {
                    hasMore = await channel.Reader.WaitToReadAsync(cts.Token);
                }
                catch (OperationCanceledException)
                {
                    finalStatus = callerToken.IsCancellationRequested
                        ? SearchStatus.Cancelled
                        : SearchStatus.TimedOut;
                    break;
                }

                if (!hasMore)
                {
                    finalStatus = SearchStatus.Completed;
                    break;
                }
            }

            // Responses can land in the channel while WaitToReadAsync is cancelling; drain them so
            // successful suppliers stay persisted even when the overall search is marked TimedOut.
            while (channel.Reader.TryRead(out var pending))
            {
                yield return pending;
                await repository.AddSupplierResponseAsync(pending, CancellationToken.None);
            }
        }
        finally
        {
            await cts.CancelAsync();
            await repository.UpdateStatusAsync(record.Id, finalStatus, CancellationToken.None);
            logger.LogInformation("Search {SearchId} finished with status {Status}.", record.Id, finalStatus);
        }
    }

    /// <summary>
    /// Filters the available suppliers based on user selection, defaulting to all if none specified.
    /// </summary>
    /// <param name="requested">Array of supplier names requested by the client.</param>
    /// <returns>List of matching configured supplier instances.</returns>
    private List<ISupplier> SelectSuppliers(string[]? requested)
    {
        var all = suppliers.ToList();
        if (requested is null || requested.Length == 0)
        {
            return all;
        }

        var wanted = new HashSet<string>(
            requested.Where(n => !string.IsNullOrWhiteSpace(n)).Select(n => n.Trim()),
            StringComparer.OrdinalIgnoreCase);

        return all.Where(s => wanted.Contains(s.Name)).ToList();
    }

    /// <summary>
    /// Dispatches background tasks for each selected supplier writing concurrently to the channel.
    /// Closes the channel writer once all suppliers complete or fail.
    /// </summary>
    /// <param name="selected">The active suppliers to query.</param>
    /// <param name="request">Search parameters passed to the suppliers.</param>
    /// <param name="searchRecordId">The parent search record identifier for correlation.</param>
    /// <param name="writer">Target channel writer for collected responses.</param>
    /// <param name="token">Cancellation token governed by caller cancellation and search timeout.</param>
    private void StartSuppliers(
        List<ISupplier> selected,
        SearchRequest request,
        Guid searchRecordId,
        ChannelWriter<SupplierResponse> writer,
        CancellationToken token)
    {
        if (selected.Count == 0)
        {
            writer.TryComplete();
            return;
        }

        var pending = selected.Count;

        foreach (var supplier in selected)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    var response = await QuerySupplierAsync(supplier, request, searchRecordId, token);
                    if (response is not null)
                    {
                        writer.TryWrite(response);
                    }
                }
                finally
                {
                    // Atomically track completion so the channel completes when the last supplier finishes
                    if (Interlocked.Decrement(ref pending) == 0)
                    {
                        writer.TryComplete();
                    }
                }
            }, CancellationToken.None);
        }
    }

    /// <summary>
    /// Queries an individual supplier, measures response latency, and handles exceptions gracefully without failing the search.
    /// </summary>
    /// <param name="supplier">The supplier implementation being queried.</param>
    /// <param name="request">Search parameters for the quote.</param>
    /// <param name="searchRecordId">Parent search ID for database persistence.</param>
    /// <param name="token">Cancellation token.</param>
    /// <returns>A populated response instance, or null if the request was intentionally aborted.</returns>
    private async Task<SupplierResponse?> QuerySupplierAsync(
        ISupplier supplier,
        SearchRequest request,
        Guid searchRecordId,
        CancellationToken token)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            var response = await supplier.GetQuoteAsync(request, token);
            response.SearchRecordId = searchRecordId;
            return response;
        }
        catch (OperationCanceledException) when (token.IsCancellationRequested)
        {
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Supplier {SupplierName} failed during quote retrieval.", supplier.Name);
            return new SupplierResponse
            {
                Id = Guid.NewGuid(),
                SearchRecordId = searchRecordId,
                SupplierName = supplier.Name,
                Price = null,
                ResponseTimeMs = stopwatch.ElapsedMilliseconds,
                IsSuccess = false,
                Timestamp = DateTimeOffset.UtcNow
            };
        }
    }
}