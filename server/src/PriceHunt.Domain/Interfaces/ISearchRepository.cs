using PriceHunt.Domain.Entities;

namespace PriceHunt.Domain.Interfaces;

public interface ISearchRepository
{
    Task AddSearchAsync(SearchRecord record, CancellationToken ct);

    Task UpdateStatusAsync(Guid searchRecordId, SearchStatus status, CancellationToken ct);

    Task AddSupplierResponseAsync(SupplierResponse response, CancellationToken ct);
}
