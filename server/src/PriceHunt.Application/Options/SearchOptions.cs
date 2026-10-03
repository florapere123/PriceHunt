namespace PriceHunt.Application.Options;

public sealed class SearchOptions
{
    public int SearchTimeoutSeconds { get; set; } = 6;

    public int DefaultPageSize { get; set; } = 20;

    public int MaxPageSize { get; set; } = 100;
}
