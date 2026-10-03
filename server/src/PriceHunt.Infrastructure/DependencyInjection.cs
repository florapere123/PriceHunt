using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PriceHunt.Domain.Interfaces;
using PriceHunt.Infrastructure.Persistence;
using PriceHunt.Infrastructure.Simulation;

namespace PriceHunt.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration,
        string contentRootPath)
    {
        var sqliteConnectionString = ResolveSqliteConnectionString(configuration, contentRootPath);

        services.AddDbContext<PriceHuntDbContext>(options =>
            options.UseSqlite(sqliteConnectionString));

        services.AddHealthChecks()
            .AddDbContextCheck<PriceHuntDbContext>();

        services.Configure<List<SupplierProfile>>(configuration.GetSection("Suppliers"));

        services.AddScoped<ISearchRepository, SearchRepository>();
        services.AddScoped<IHistoryQuery, HistoryQuery>();

        services.AddSingleton<IEnumerable<ISupplier>>(sp =>
        {
            var profiles = sp.GetRequiredService<IOptions<List<SupplierProfile>>>().Value;
            if (profiles.Count == 0)
            {
                throw new InvalidOperationException("At least one supplier must be configured in suppliers.json.");
            }

            var loggerFactory = sp.GetRequiredService<ILoggerFactory>();
            return profiles
                .Select(profile => (ISupplier)new SimulatedSupplier(profile, loggerFactory.CreateLogger<SimulatedSupplier>()))
                .ToList();
        });

        return services;
    }

    private static string ResolveSqliteConnectionString(IConfiguration configuration, string contentRoot)
    {
        const string prefix = "Data Source=";
        var configured = configuration.GetConnectionString("PriceHunt");

        if (string.IsNullOrWhiteSpace(configured))
        {
            return $"{prefix}{Path.Combine(contentRoot, "pricehunt.db")}";
        }

        if (configured.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            var dataSource = configured[prefix.Length..].Trim().Trim('"');
            if (!Path.IsPathRooted(dataSource))
            {
                dataSource = Path.Combine(contentRoot, dataSource);
            }

            return $"{prefix}{dataSource}";
        }

        return configured;
    }
}
