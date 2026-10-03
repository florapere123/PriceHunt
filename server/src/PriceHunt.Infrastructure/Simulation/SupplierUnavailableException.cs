namespace PriceHunt.Infrastructure.Simulation;

public sealed class SupplierUnavailableException(string supplierName)
    : Exception($"Supplier '{supplierName}' failed to return a quote.")
{
    public string SupplierName { get; } = supplierName;
}
