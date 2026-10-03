namespace PriceHunt.Domain.ValueObjects;

/// <param name="SelectedSuppliers">Supplier names to query. Null or empty means "query all suppliers".</param>
public sealed record SearchRequest(
    string FromLocation,
    string ToLocation,
    DateOnly FromDate,
    DateOnly ToDate,
    string[]? SelectedSuppliers)
{
    public Dictionary<string, string[]> Validate()
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(FromLocation))
        {
            errors[nameof(FromLocation)] = ["FromLocation is required."];
        }

        if (string.IsNullOrWhiteSpace(ToLocation))
        {
            errors[nameof(ToLocation)] = ["ToLocation is required."];
        }

        if (ToDate < FromDate)
        {
            errors[nameof(ToDate)] = ["ToDate must be on or after FromDate."];
        }

        return errors;
    }
}
