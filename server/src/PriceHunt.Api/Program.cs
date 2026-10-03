using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Routing.Constraints;
using PriceHunt.Api.Endpoints;
using PriceHunt.Api.Middleware;
using PriceHunt.Application;
using PriceHunt.Infrastructure;
using PriceHunt.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
 
builder.Configuration.AddJsonFile("suppliers.json", optional: false, reloadOnChange: true);

builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));

const string ClientCorsPolicy = "Client";
builder.Services.AddCors(options =>
    options.AddPolicy(ClientCorsPolicy, policy => policy
        .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:4200"])
        .AllowAnyHeader()
        .WithMethods("GET", "POST")));

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration, builder.Environment.ContentRootPath);

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PriceHuntDbContext>();
    db.Database.EnsureCreated();
    await SearchStatusSeeder.SeedAsync(db);
}

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "PriceHunt API v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors(ClientCorsPolicy);

app.MapHealthChecks("/health");
app.MapSearchEndpoints();
app.MapHistoryEndpoints();
app.MapSupplierEndpoints();

app.Run();
