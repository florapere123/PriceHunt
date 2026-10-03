using Microsoft.EntityFrameworkCore;
using PriceHunt.Domain.Entities;

namespace PriceHunt.Infrastructure.Persistence;

public static class SearchStatusSeeder
{
    public static readonly (string Code, string Name)[] DefaultStatuses =
    [
        (nameof(SearchStatus.Running), "Running"),
        (nameof(SearchStatus.Completed), "Completed"),
        (nameof(SearchStatus.TimedOut), "Timed out"),
        (nameof(SearchStatus.Cancelled), "Cancelled"),
    ];

    public static async Task SeedAsync(PriceHuntDbContext dbContext, CancellationToken ct = default)
    {
        if (await dbContext.SearchStatuses.AnyAsync(ct))
        {
            return;
        }

        foreach (var (code, name) in DefaultStatuses)
        {
            dbContext.SearchStatuses.Add(new SearchStatusLookup { Code = code, Name = name });
        }

        await dbContext.SaveChangesAsync(ct);
    }
}
