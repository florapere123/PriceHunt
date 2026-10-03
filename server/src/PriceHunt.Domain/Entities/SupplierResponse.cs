namespace PriceHunt.Domain.Entities;

public class SupplierResponse
{
    public Guid Id { get; set; }

    public Guid SearchRecordId { get; set; }

    public string SupplierName { get; set; } = string.Empty;

    public decimal? Price { get; set; }

    public long ResponseTimeMs { get; set; }

    public bool IsSuccess { get; set; }

    public DateTimeOffset Timestamp { get; set; }
}
