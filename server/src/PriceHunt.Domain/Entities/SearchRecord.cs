using System.Text.Json.Serialization;

namespace PriceHunt.Domain.Entities;

public class SearchRecord
{
    public Guid Id { get; set; }

    public string FromLocation { get; set; } = string.Empty;

    public string ToLocation { get; set; } = string.Empty;

    public DateOnly FromDate { get; set; }

    public DateOnly ToDate { get; set; }

    /// <summary>Comma-separated names of the suppliers that were queried.</summary>
    public string SelectedSuppliers { get; set; } = string.Empty;

    /// <summary>Foreign key to <see cref="SearchStatusLookup.Code"/>.</summary>
    [JsonPropertyName("status")]
    public string StatusCode { get; set; } = SearchStatus.Running.ToString();

    [JsonIgnore]
    public SearchStatusLookup Status { get; set; } = null!;

    public DateTimeOffset Timestamp { get; set; }

    /// <summary>Human-readable UTC creation time (ISO 8601, e.g. yyyy-MM-ddTHH:mm:ssZ).</summary>
    public string CreatedAt { get; set; } = string.Empty;

    public List<SupplierResponse> Responses { get; set; } = [];
}
