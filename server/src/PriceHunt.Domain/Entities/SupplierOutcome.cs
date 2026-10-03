namespace PriceHunt.Domain.Entities;

/// <summary>
/// Per-supplier result for a search, independent of the parent search lifecycle status.
/// </summary>
public enum SupplierOutcome
{
    Pending = 0,
    Success = 1,
    Failed = 2,
    Timeout = 3,
    Cancelled = 4,
}
