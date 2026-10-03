using PriceHunt.Api.Streaming;
using PriceHunt.Application.Search;
using PriceHunt.Domain.Entities;
using PriceHunt.Domain.ValueObjects;

namespace PriceHunt.Api.Endpoints;

public static class SearchEndpoints
{
    /// <summary>
    /// Registers the streaming search endpoint that validates input and delegates to the orchestrator.
    /// </summary>
    /// <param name="app">The application's endpoint route builder to map routes onto.</param>
    /// <returns>The same <paramref name="app"/> instance to allow fluent endpoint registration chaining.</returns>
    public static IEndpointRouteBuilder MapSearchEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/search", IResult (SearchRequest request, 
            SearchOrchestrator orchestrator, CancellationToken ct) =>
            {
                var errors = request.Validate();
                if (errors.Count > 0)
                {
                    return Results.ValidationProblem(errors);
                }

                return new NdJsonResult<SupplierResponse>(orchestrator.RunAsync(request, ct));
            })
            .WithName("SearchData")
            .WithTags("Search")
            .WithSummary("Queries suppliers concurrently and streams each quote as NDJSON as soon as it arrives.")
            .Accepts<SearchRequest>("application/json")
            .Produces<SupplierResponse>(StatusCodes.Status200OK, NdJsonResult<SupplierResponse>.ContentType)
            .ProducesValidationProblem();

        return app;
    }
}
