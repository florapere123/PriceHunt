using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PriceHunt.Application.Options;
using PriceHunt.Infrastructure.Persistence;

namespace PriceHunt.Api.Tests;

/// <summary>
/// Boots the real API pipeline with an isolated in-memory SQLite database per factory instance.
/// </summary>
public sealed class PriceHuntWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection;

    public PriceHuntWebApplicationFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cors:AllowedOrigins:0"] = "http://localhost:4200",
                ["SearchOptions:SearchTimeoutSeconds"] = "5",
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<PriceHuntDbContext>>();
            services.RemoveAll<PriceHuntDbContext>();

            services.AddDbContext<PriceHuntDbContext>(options => options.UseSqlite(_connection));

            services.PostConfigure<SearchOptions>(options => options.SearchTimeoutSeconds = 5);
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _connection.Dispose();
        }

        base.Dispose(disposing);
    }
}
