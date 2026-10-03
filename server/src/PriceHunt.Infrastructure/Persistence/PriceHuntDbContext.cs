using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using PriceHunt.Domain.Entities;

namespace PriceHunt.Infrastructure.Persistence;

public class PriceHuntDbContext(DbContextOptions<PriceHuntDbContext> options) : DbContext(options)
{
    public DbSet<SearchRecord> SearchRecords => Set<SearchRecord>();

    public DbSet<SupplierResponse> SupplierResponses => Set<SupplierResponse>();

    public DbSet<SearchStatusLookup> SearchStatuses => Set<SearchStatusLookup>();

    /// <summary>
    /// Configures persistence mapping and indexes tuned for history queries rather than rich domain graphs.
    /// </summary>
    /// <remarks>
    /// Search status is a seeded lookup table (not an enum column) so labels stay data-driven and history
    /// filters can use indexed FK joins. Supplier responses cascade-delete with their parent search;
    /// status codes use Restrict so a referenced lookup row cannot be removed accidentally.
    /// </remarks>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SearchStatusLookup>(entity =>
        {
            entity.ToTable("SearchStatuses");
            entity.HasKey(s => s.Code);
            entity.Property(s => s.Code).IsRequired().HasMaxLength(20);
            entity.Property(s => s.Name).IsRequired().HasMaxLength(50);
        });

        modelBuilder.Entity<SearchRecord>(entity =>
        {
            entity.ToTable("SearchRecords");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.FromLocation).IsRequired().HasMaxLength(200);
            entity.Property(r => r.ToLocation).IsRequired().HasMaxLength(200);
            entity.Property(r => r.SelectedSuppliers).IsRequired().HasMaxLength(1000);
            entity.Property(r => r.StatusCode).IsRequired().HasMaxLength(20);
            entity.Property(r => r.Timestamp).HasConversion(UtcTicksConverter);
            entity.Property(r => r.CreatedAt).IsRequired().HasMaxLength(24);
            entity.HasIndex(r => r.Timestamp);
            entity.HasIndex(r => r.StatusCode);
            entity.HasIndex(r => new { r.StatusCode, r.Timestamp });

            // FK to SearchStatuses by Code (not Id) so the persisted string is both the column value and the relational key.
            entity.HasOne(r => r.Status)
                .WithMany()
                .HasForeignKey(r => r.StatusCode)
                .HasPrincipalKey(s => s.Code)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(r => r.Responses)
                .WithOne()
                .HasForeignKey(s => s.SearchRecordId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SupplierResponse>(entity =>
        {
            entity.ToTable("SupplierResponses");
            entity.HasKey(s => s.Id);
            entity.Property(s => s.SupplierName).IsRequired().HasMaxLength(100);
            entity.Property(s => s.Price).HasPrecision(18, 2);
            entity.Property(s => s.Timestamp).HasConversion(UtcTicksConverter);
            entity.HasIndex(s => s.SearchRecordId);
        });
    }

    // SQLite cannot translate DateTimeOffset in SQL; store UTC ticks and map back at the edge.
    private static readonly ValueConverter<DateTimeOffset, long> UtcTicksConverter = new(
        v => v.UtcTicks,
        v => new DateTimeOffset(v, TimeSpan.Zero));
}
