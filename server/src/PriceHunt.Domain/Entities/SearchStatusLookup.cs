namespace PriceHunt.Domain.Entities;

/// <summary>Lookup row for persisted search lifecycle statuses.</summary>
public class SearchStatusLookup
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}
