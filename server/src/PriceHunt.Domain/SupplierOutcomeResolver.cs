using PriceHunt.Domain.Entities;

namespace PriceHunt.Domain;

/// <summary>
/// Derives the per-supplier outcome shown in history from a persisted response and the parent search status.
/// </summary>
public static class SupplierOutcomeResolver
{
    public static SupplierOutcome Resolve(SearchStatus searchStatus, SupplierResponse? response)
    {
        if (response is not null)
        {
            return response.IsSuccess ? SupplierOutcome.Success : SupplierOutcome.Failed;
        }

        return searchStatus switch
        {
            SearchStatus.Running => SupplierOutcome.Pending,
            SearchStatus.Cancelled => SupplierOutcome.Cancelled,
            _ => SupplierOutcome.Timeout,
        };
    }

    public static SearchStatus ParseSearchStatus(string statusCode) =>
        Enum.TryParse<SearchStatus>(statusCode, out var status) ? status : SearchStatus.TimedOut;
}
