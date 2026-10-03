using PriceHunt.Domain.Interfaces;
using PriceHunt.Domain.ValueObjects;

namespace PriceHunt.Api.Endpoints;

public static class HistoryEndpoints
{
    public static IEndpointRouteBuilder MapHistoryEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/history",
            async ([AsParameters] HistoryFilter filter,
            IHistoryQuery historyQuery,
            CancellationToken ct) =>
                TypedResults.Ok(await historyQuery.GetHistoryAsync(filter, ct)))
            .WithName("GetHistory")
            .WithTags("History")
            .WithSummary("Returns paginated search history as one row per (search, supplier response) pair.")
            .WithDescription(
                "Filters (including one or more suppliers via repeated ?suppliers= query keys), sorting " +
                "(date, route, supplier, price, responseTime) and pagination apply to the flattened rows. " +
                "Searches without any persisted supplier response produce a single row with null supplier fields.")
            .Produces<PagedResult<HistoryRowDto>>();

        return app;
    }
}
