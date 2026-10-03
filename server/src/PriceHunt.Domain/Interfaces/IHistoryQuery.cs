using PriceHunt.Domain.ValueObjects;

namespace PriceHunt.Domain.Interfaces;

public interface IHistoryQuery
{
    Task<PagedResult<HistoryRowDto>> GetHistoryAsync(HistoryFilter filter, CancellationToken ct);
}
