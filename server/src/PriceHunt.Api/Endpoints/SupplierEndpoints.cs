using Microsoft.Extensions.Options;
using PriceHunt.Infrastructure.Simulation;

namespace PriceHunt.Api.Endpoints;

public static class SupplierEndpoints
{
    /// <summary>
    /// list of suppliers
    /// </summary>
    /// <param name="app"></param>
    /// <returns></returns>
    public static IEndpointRouteBuilder MapSupplierEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/suppliers", (IOptions<List<SupplierProfile>> options) =>
            Results.Ok(options.Value.Select(s => s.Name).OrderBy(n => n).ToArray()))
            .WithName("GetSuppliers")
            .WithTags("Suppliers")
            .WithSummary("Returns the names of all configured suppliers available for search.")
            .Produces<string[]>();

        return app;
    }
}
