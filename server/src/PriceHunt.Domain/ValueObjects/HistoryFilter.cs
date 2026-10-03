namespace PriceHunt.Domain.ValueObjects;

public sealed class HistoryFilter
{
    public string? FromLocation { get; set; }

    public string? ToLocation { get; set; }

    public string? Status { get; set; }

    public string[]? Suppliers { get; set; }

    public DateTimeOffset? Since { get; set; }

    public DateTimeOffset? Until { get; set; }

    public int? Page { get; set; }

    public int? PageSize { get; set; }

    public string? SortBy { get; set; }

    public string? SortDir { get; set; }

    public int NormalizedPage => Math.Max(1, Page ?? 1);

    public bool IsAscending => string.Equals(SortDir, "asc", StringComparison.OrdinalIgnoreCase);
}
