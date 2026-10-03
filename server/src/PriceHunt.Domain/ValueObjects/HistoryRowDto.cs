using PriceHunt.Domain.Entities;

namespace PriceHunt.Domain.ValueObjects;

/// <summary>
/// One history row per selected supplier for a search (or a single placeholder row when no responses exist).
/// <see cref="SupplierOutcome"/> reflects that supplier's result; run-level fields summarize the parent search.
/// </summary>
public sealed record HistoryRowDto(
    Guid SearchId,
    string CreatedAt,
    string FromLocation,
    string ToLocation,
    string? SupplierName,
    decimal? Price,
    long? ResponseTimeMs,
    bool? IsSuccess,
    SupplierOutcome SupplierOutcome,
    SearchStatusDto SearchStatus,
    int RespondedCount,
    int TotalSuppliersCount);
