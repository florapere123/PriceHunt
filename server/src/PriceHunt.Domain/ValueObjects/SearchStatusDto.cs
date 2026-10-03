namespace PriceHunt.Domain.ValueObjects;

/// <summary>API representation of a search record status from the lookup table.</summary>
public sealed record SearchStatusDto(string Code, string Name);
