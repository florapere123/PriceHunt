namespace PriceHunt.Infrastructure.Simulation;

/// <param name="FailureProbability">
/// Per-attempt failure rate (0–1). Each call to <c>GetQuoteAsync</c> is an independent trial;
/// Polly may retry once on <see cref="SupplierUnavailableException"/> before the failure surfaces.
/// </param>
public sealed record SupplierProfile(
    string Name,
    int MinDelayMs,
    int MaxDelayMs,
    double FailureProbability = 0,
    bool NeverResponds = false);
