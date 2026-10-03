using Microsoft.EntityFrameworkCore;
using PriceHunt.Domain;
using PriceHunt.Domain.Entities;
using PriceHunt.Domain.Interfaces;

namespace PriceHunt.Infrastructure.Persistence;

public class SearchRepository(PriceHuntDbContext dbContext) : ISearchRepository
{
    public async Task AddSearchAsync(SearchRecord record, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(record.CreatedAt))
        {
            var utc = record.Timestamp == default ? DateTimeOffset.UtcNow : record.Timestamp;
            record.Timestamp = utc;
            record.CreatedAt = UtcTimestamps.FormatCreatedAt(utc);
        }

        dbContext.SearchRecords.Add(record);
        await dbContext.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Persists the terminal search status after streaming completes.
    /// </summary>
    /// <remarks>
    /// The orchestrator adds the record and later updates it in the same scoped DbContext, so the
    /// entity is usually still tracked. Updating the tracked instance avoids a redundant load and
    /// keeps the change tracker consistent. When it is not tracked, ExecuteUpdateAsync issues a
    /// direct SQL UPDATE without materializing the row — a lighter path for the same outcome.
    /// </remarks>
    public async Task UpdateStatusAsync(Guid searchRecordId, SearchStatus status, CancellationToken ct)
    {
        var statusCode = status.ToString();
        var tracked = dbContext.SearchRecords.Local.FirstOrDefault(r => r.Id == searchRecordId);
        if (tracked is not null)
        {
            tracked.StatusCode = statusCode;
            await dbContext.SaveChangesAsync(ct);
            return;
        }

        await dbContext.SearchRecords
            .Where(r => r.Id == searchRecordId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(r => r.StatusCode, statusCode), ct);
    }

    public async Task AddSupplierResponseAsync(SupplierResponse response, CancellationToken ct)
    {
        dbContext.SupplierResponses.Add(response);
        await dbContext.SaveChangesAsync(ct);
    }
}
