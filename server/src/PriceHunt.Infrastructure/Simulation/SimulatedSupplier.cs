using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;
using PriceHunt.Domain.Entities;
using PriceHunt.Domain.Interfaces;
using PriceHunt.Domain.ValueObjects;

namespace PriceHunt.Infrastructure.Simulation;

public sealed class SimulatedSupplier : ISupplier
{
    private const int MinPrice = 100;
    private const int MaxPrice = 1000;

    private readonly SupplierProfile _profile;
    private readonly ILogger<SimulatedSupplier> _logger;
    private readonly ResiliencePipeline _retryPipeline;

    public SimulatedSupplier(SupplierProfile profile, ILogger<SimulatedSupplier> logger)
    {
        ArgumentNullException.ThrowIfNull(profile);
        ArgumentException.ThrowIfNullOrWhiteSpace(profile.Name);
        ArgumentOutOfRangeException.ThrowIfNegative(profile.MinDelayMs);
        ArgumentOutOfRangeException.ThrowIfLessThan(profile.MaxDelayMs, profile.MinDelayMs);
        ArgumentOutOfRangeException.ThrowIfNegative(profile.FailureProbability);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(profile.FailureProbability, 1);

        _profile = profile;
        _logger = logger;
        _retryPipeline = new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                MaxRetryAttempts = 1,
                ShouldHandle = new PredicateBuilder().Handle<SupplierUnavailableException>(),
                OnRetry = args =>
                {
                    _logger.LogWarning(
                        "Retrying supplier {SupplierName} after transient failure (attempt {AttemptNumber}).",
                        _profile.Name,
                        args.AttemptNumber);
                    return ValueTask.CompletedTask;
                }
            })
            .Build();
    }

    public string Name => _profile.Name;

    public async Task<SupplierResponse> GetQuoteAsync(SearchRequest request, CancellationToken ct)
    {
        try
        {
            return await _retryPipeline.ExecuteAsync(
                token => new ValueTask<SupplierResponse>(GetQuoteCoreAsync(request, token)),
                ct);
        }
        catch (SupplierUnavailableException)
        {
            _logger.LogWarning("Supplier {SupplierName} failed to return a quote.", _profile.Name);
            throw;
        }
    }

    private async Task<SupplierResponse> GetQuoteCoreAsync(SearchRequest request, CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();

        if (_profile.NeverResponds)
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, ct);
        }

        var delayMs = Random.Shared.Next(_profile.MinDelayMs, _profile.MaxDelayMs + 1);
        await Task.Delay(delayMs, ct);

        if (Random.Shared.NextDouble() < _profile.FailureProbability)
        {
            throw new SupplierUnavailableException(_profile.Name);
        }

        var price = Math.Round(MinPrice + (decimal)Random.Shared.NextDouble() * (MaxPrice - MinPrice), 2);

        return new SupplierResponse
        {
            Id = Guid.NewGuid(),
            SupplierName = _profile.Name,
            Price = price,
            ResponseTimeMs = stopwatch.ElapsedMilliseconds,
            IsSuccess = true,
            Timestamp = DateTimeOffset.UtcNow
        };
    }
}
