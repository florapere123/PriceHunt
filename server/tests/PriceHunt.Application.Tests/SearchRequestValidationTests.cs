using PriceHunt.Application.Tests.TestData;
using PriceHunt.Domain.ValueObjects;
using Xunit;

namespace PriceHunt.Application.Tests;

public class SearchRequestValidationTests
{
    /// <summary>
    /// Verifies invalid fixture requests produce the expected validation error keys and count.
    /// </summary>
    [Fact]
    public void Validate_InvalidDateRangeAndEmptyLocations_ReturnsValidationErrors()
    {
        var fixture = TestFixtureLoader.LoadJson<SearchRequestsFixture>("TestData/search-requests.json");

        foreach (var invalidCase in fixture.Invalid)
        {
            var errors = invalidCase.ToSearchRequest().Validate();

            foreach (var key in invalidCase.ExpectedErrorKeys)
            {
                Assert.True(errors.ContainsKey(key));
            }

            Assert.Equal(invalidCase.ExpectedErrorCount, errors.Count);
        }
    }
}