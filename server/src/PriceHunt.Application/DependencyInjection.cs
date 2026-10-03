using Microsoft.Extensions.DependencyInjection;
using PriceHunt.Application.Options;
using PriceHunt.Application.Search;

namespace PriceHunt.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddOptions<SearchOptions>()
            .BindConfiguration("SearchOptions");

        services.AddScoped<SearchOrchestrator>();

        return services;
    }
}
