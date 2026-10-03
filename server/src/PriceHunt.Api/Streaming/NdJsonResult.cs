using System.Text.Json;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Options;
using JsonOptions = Microsoft.AspNetCore.Http.Json.JsonOptions;

namespace PriceHunt.Api.Streaming;

/// <summary>
/// Streams supplier results progressively over HTTP using Newline-Delimited JSON (NDJSON).
/// Architectural decision:
/// NDJSON over a standard HTTP POST request was chosen over WebSockets/SignalR and Server-Sent Events (SSE)
/// because flight search is a short-lived, unidirectional query initiated with complex request criteria.
/// WebSockets and SignalR add unnecessary stateful connection management, reconnect logic, and protocol overhead
/// for what is essentially a single request that completes in seconds. Standard SSE natively relies on HTTP GET,
/// making it awkward for sending rich search parameters in a request body, and enforces custom event formatting.
/// NDJSON allows a standard POST body for query parameters while letting the client read line-by-line JSON objects
/// incrementally using the native browser fetch and ReadableStream APIs without any external libraries./// </summary>
/// <typeparam name="T">The type of the items being streamed.</typeparam>
/// <param name="items"></param>
public sealed class NdJsonResult<T>(IAsyncEnumerable<T> items) : IResult
{
    /// <summary>
    /// The standard MIME type for Newline-Delimited JSON.
    /// </summary>
    public const string ContentType = "application/x-ndjson";

    private static readonly byte[] NewLine = "\n"u8.ToArray();

    /// <summary>
    /// Executes the result operation, writing the items sequentially to the HTTP response stream.
    /// </summary>
    /// <param name="httpContext">The context for the current request.</param>
    public async Task ExecuteAsync(HttpContext httpContext)
    {
        var serializerOptions = httpContext.RequestServices
            .GetRequiredService<IOptions<JsonOptions>>().Value.SerializerOptions;

        var response = httpContext.Response;
        var ct = httpContext.RequestAborted;

        response.StatusCode = StatusCodes.Status200OK;
        response.ContentType = ContentType;
        httpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();

        await response.StartAsync(ct);

        await foreach (var item in items.WithCancellation(ct))
        {
            await JsonSerializer.SerializeAsync(response.Body, item, serializerOptions, ct);
            await response.Body.WriteAsync(NewLine, ct);
            await response.Body.FlushAsync(ct);
        }
    }
}
