using System.Text.Json;
using System.Text.Json.Serialization;

namespace PriceHunt.Application.Tests.TestData;

public static class TestFixtureLoader
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    /// <summary>
    /// Deserializes a JSON test fixture from the test output directory.
    /// </summary>
    public static T LoadJson<T>(string relativePath)
    {
        var fullPath = Path.Combine(AppContext.BaseDirectory, relativePath);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"Test fixture not found at path: {fullPath}");
        }

        var json = File.ReadAllText(fullPath);
        return JsonSerializer.Deserialize<T>(json, Options)
            ?? throw new InvalidOperationException($"Failed to deserialize test fixture: {relativePath}");
    }
}