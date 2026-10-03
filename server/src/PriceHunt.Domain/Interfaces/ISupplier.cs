using PriceHunt.Domain.Entities;
using PriceHunt.Domain.ValueObjects;

namespace PriceHunt.Domain.Interfaces;

public interface ISupplier
{
    /// <summary>Unique supplier name, used to match <see cref="SearchRequest.SelectedSuppliers"/>.</summary>
    string Name { get; }

    Task<SupplierResponse> GetQuoteAsync(SearchRequest request, CancellationToken ct);
}
