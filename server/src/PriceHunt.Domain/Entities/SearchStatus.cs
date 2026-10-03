namespace PriceHunt.Domain.Entities;

public enum SearchStatus
{
    Running = 0,
    Completed = 1,
    TimedOut = 2,
    Cancelled = 3
}
