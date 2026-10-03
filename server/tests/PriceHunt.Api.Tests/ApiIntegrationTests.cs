using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using PriceHunt.Api.Streaming;
using PriceHunt.Domain.Entities;
using Xunit;

namespace PriceHunt.Api.Tests;

public sealed class ApiIntegrationTests : IClassFixture<PriceHuntWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ApiIntegrationTests(PriceHuntWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PostSearch_ValidRequest_ReturnsNdJsonWithOneLinePerSelectedSupplier()
    {
        var body = new
        {
            fromLocation = "London",
            toLocation = "Paris",
            fromDate = "2026-06-01",
            toDate = "2026-06-08",
            selectedSuppliers = new[] { "Supplier A", "Supplier B" },
        };

        using var response = await _client.PostAsJsonAsync("/api/search", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(NdJsonResult<SupplierResponse>.ContentType, response.Content.Headers.ContentType?.MediaType);

        var content = await response.Content.ReadAsStringAsync();
        var lines = content
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        Assert.Equal(2, lines.Length);

        foreach (var line in lines)
        {
            using var document = JsonDocument.Parse(line);
            Assert.True(document.RootElement.TryGetProperty("supplierName", out _));
        }
    }

    [Fact]
    public async Task PostSearch_InvalidFromLocation_ReturnsValidationProblem()
    {
        var body = new
        {
            fromLocation = "",
            toLocation = "Paris",
            fromDate = "2026-06-01",
            toDate = "2026-06-08",
            selectedSuppliers = new[] { "Supplier A" },
        };

        using var response = await _client.PostAsJsonAsync("/api/search", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var errors = document.RootElement.GetProperty("errors");
        Assert.True(errors.TryGetProperty("FromLocation", out var fromLocationErrors));
        Assert.NotEmpty(fromLocationErrors.EnumerateArray());
    }

    [Fact]
    public async Task GetHistory_EmptyDatabase_ReturnsPagedResultShape()
    {
        using var response = await _client.GetAsync("/api/history");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;

        Assert.Equal(JsonValueKind.Array, root.GetProperty("items").ValueKind);
        Assert.Equal(0, root.GetProperty("items").GetArrayLength());
        Assert.True(root.GetProperty("page").GetInt32() >= 1);
        Assert.True(root.GetProperty("pageSize").GetInt32() > 0);
        Assert.Equal(0, root.GetProperty("totalCount").GetInt32());
        Assert.Equal(0, root.GetProperty("totalPages").GetInt32());
    }

    [Fact]
    public async Task Options_FromDisallowedOrigin_DoesNotReturnAccessControlAllowOrigin()
    {
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/search");
        request.Headers.TryAddWithoutValidation("Origin", "http://not-allowed.example");
        request.Headers.TryAddWithoutValidation("Access-Control-Request-Method", "POST");

        using var response = await _client.SendAsync(request);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
