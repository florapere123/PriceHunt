using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PriceHunt.Application.Options;
using PriceHunt.Domain;
using PriceHunt.Domain.Entities;
using PriceHunt.Domain.Interfaces;
using PriceHunt.Domain.ValueObjects;

namespace PriceHunt.Infrastructure.Persistence;

public class HistoryQuery(PriceHuntDbContext dbContext, IOptions<SearchOptions> searchOptions) : IHistoryQuery
{
    public async Task<PagedResult<HistoryRowDto>> GetHistoryAsync(HistoryFilter filter, CancellationToken ct)
    {
        IQueryable<SearchRecord> records = dbContext.SearchRecords.AsNoTracking()
            .Include(r => r.Status)
            .Include(r => r.Responses);

        if (!string.IsNullOrWhiteSpace(filter.FromLocation))
        {
            var from = filter.FromLocation.Trim().ToLower();
            records = records.Where(r => r.FromLocation.ToLower().Contains(from));
        }

        if (!string.IsNullOrWhiteSpace(filter.ToLocation))
        {
            var to = filter.ToLocation.Trim().ToLower();
            records = records.Where(r => r.ToLocation.ToLower().Contains(to));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            var statusCode = filter.Status.Trim();
            records = records.Where(r => r.StatusCode == statusCode);
        }

        if (filter.Since is { } since)
        {
            records = records.Where(r => r.Timestamp >= since);
        }

        if (filter.Until is { } until)
        {
            records = records.Where(r => r.Timestamp <= until);
        }

        var materialized = await records.ToListAsync(ct);
        var rows = materialized.SelectMany(ExpandSearchRecord).ToList();

        if (filter.Suppliers is { Length: > 0 } suppliers)
        {
            var names = suppliers
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (names.Count > 0)
            {
                rows = rows
                    .Where(x => x.SupplierName is not null && names.Contains(x.SupplierName))
                    .ToList();
            }
        }

        var page = filter.NormalizedPage;
        var pageSize = NormalizePageSize(filter.PageSize);
        var totalCount = rows.Count;

        var sorted = ApplySorting(rows, filter);
        var items = sorted
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ToDto)
            .ToList();

        return new PagedResult<HistoryRowDto>(items, page, pageSize, totalCount);
    }

    private static IEnumerable<HistoryRow> ExpandSearchRecord(SearchRecord record)
    {
        if (record.Responses.Count == 0)
        {
            yield return new HistoryRow
            {
                Record = record,
                SupplierName = null,
                Response = null,
            };
            yield break;
        }

        var selected = record.SelectedSuppliers
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        if (selected.Length == 0)
        {
            foreach (var response in record.Responses)
            {
                yield return new HistoryRow
                {
                    Record = record,
                    SupplierName = response.SupplierName,
                    Response = response,
                };
            }

            yield break;
        }

        foreach (var supplierName in selected)
        {
            var response = record.Responses.FirstOrDefault(r =>
                string.Equals(r.SupplierName, supplierName, StringComparison.OrdinalIgnoreCase));

            yield return new HistoryRow
            {
                Record = record,
                SupplierName = supplierName,
                Response = response,
            };
        }
    }

    private static HistoryRowDto ToDto(HistoryRow row)
    {
        var searchStatus = SupplierOutcomeResolver.ParseSearchStatus(row.Record.StatusCode);
        var (respondedCount, totalSuppliersCount) = GetSearchRunCounts(row.Record);

        return new HistoryRowDto(
            row.Record.Id,
            row.Record.CreatedAt,
            row.Record.FromLocation,
            row.Record.ToLocation,
            row.SupplierName,
            row.Response?.Price,
            row.Response?.ResponseTimeMs,
            row.Response?.IsSuccess,
            SupplierOutcomeResolver.Resolve(searchStatus, row.Response),
            new SearchStatusDto(row.Record.Status.Code, row.Record.Status.Name),
            respondedCount,
            totalSuppliersCount);
    }

    /// <summary>
    /// Responded = persisted supplier responses (success or explicit failure); total = selected suppliers queried.
    /// </summary>
    private static (int RespondedCount, int TotalSuppliersCount) GetSearchRunCounts(SearchRecord record)
    {
        var selected = record.SelectedSuppliers
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        var totalSuppliersCount = selected.Length > 0
            ? selected.Length
            : record.Responses.Count > 0
                ? record.Responses.Count
                : 1;

        var respondedCount = record.Responses.Count;

        return (respondedCount, totalSuppliersCount);
    }

    private int NormalizePageSize(int? pageSize)
    {
        var options = searchOptions.Value;
        return pageSize is null or < 1
            ? options.DefaultPageSize
            : Math.Min(pageSize.Value, options.MaxPageSize);
    }

    private static List<HistoryRow> ApplySorting(List<HistoryRow> rows, HistoryFilter filter)
    {
        var ascending = filter.IsAscending;
        var sortBy = filter.SortBy?.Trim().ToLowerInvariant();

        IOrderedEnumerable<HistoryRow> ordered = sortBy switch
        {
            "route" => ascending
                ? rows.OrderBy(x => x.Record.FromLocation).ThenBy(x => x.Record.ToLocation)
                : rows.OrderByDescending(x => x.Record.FromLocation).ThenByDescending(x => x.Record.ToLocation),

            "supplier" => ascending
                ? rows.OrderBy(x => x.SupplierName)
                : rows.OrderByDescending(x => x.SupplierName),

            "price" => ascending
                ? rows.OrderBy(x => x.Response?.Price)
                : rows.OrderByDescending(x => x.Response?.Price),

            "responsetime" => ascending
                ? rows.OrderBy(x => x.Response?.ResponseTimeMs)
                : rows.OrderByDescending(x => x.Response?.ResponseTimeMs),

            "date" => ascending
                ? rows.OrderBy(x => x.Record.Timestamp)
                : rows.OrderByDescending(x => x.Record.Timestamp),

            _ => rows.OrderByDescending(x => x.Record.Timestamp),
        };

        return ordered
            .ThenByDescending(x => x.Record.Timestamp)
            .ThenBy(x => x.SupplierName)
            .ThenBy(x => x.Record.Id)
            .ToList();
    }

    private sealed class HistoryRow
    {
        public required SearchRecord Record { get; init; }

        public string? SupplierName { get; init; }

        public SupplierResponse? Response { get; init; }
    }
}
