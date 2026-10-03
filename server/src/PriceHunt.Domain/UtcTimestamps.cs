using System.Globalization;

namespace PriceHunt.Domain;

public static class UtcTimestamps
{
    /// <summary>Formats a UTC instant as ISO 8601 text (yyyy-MM-ddTHH:mm:ssZ).</summary>
    public static string FormatCreatedAt(DateTimeOffset utc) =>
        utc.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);
}
