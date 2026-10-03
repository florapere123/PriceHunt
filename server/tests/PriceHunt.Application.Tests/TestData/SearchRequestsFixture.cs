using PriceHunt.Domain.ValueObjects;

namespace PriceHunt.Application.Tests.TestData;

public sealed class SearchRequestsFixture
{
    public SearchRequestData Valid { get; set; } = new();

    public List<InvalidSearchRequestData> Invalid { get; set; } = [];
}

public class SearchRequestData
{
    public string FromLocation { get; set; } = string.Empty;

    public string ToLocation { get; set; } = string.Empty;

    public DateOnly FromDate { get; set; }

    public DateOnly ToDate { get; set; }

    public string[]? SelectedSuppliers { get; set; }

    public SearchRequest ToSearchRequest() =>
        new(FromLocation, ToLocation, FromDate, ToDate, SelectedSuppliers);
}

public sealed class InvalidSearchRequestData : SearchRequestData
{
    public string[] ExpectedErrorKeys { get; set; } = [];

    public int ExpectedErrorCount { get; set; }
}
