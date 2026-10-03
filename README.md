# PriceHunt — Shipping Price Aggregator

PriceHunt is a full-stack web application that aggregates shipping price quotes
from multiple simulated suppliers. It streams results to the UI in real time as
each supplier responds, and persists every search and its per-supplier outcomes
for later filtering on a dedicated History screen.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | .NET 10 Web API, Entity Framework Core, Clean Architecture (Domain / Application / Infrastructure / Api) |
| Frontend | Angular 22.2 (zoneless), `@ngrx/signals` SignalStore v22.0.1, RxJS, Zod (schema validation), Tailwind CSS, TypeScript |
| Database | SQLite |

---

## Quick start

```bash
npm start
```

Run from the repository root. This:

1. Installs dependencies for both projects (if not already installed).
2. Launches the .NET 10 API and the Angular 22.2 client together, in one terminal.
3. Creates and initializes the SQLite schema (`pricehunt.db`) automatically on
   first run — no manual migration step required.

- Client: `http://localhost:4200`
- API / Swagger: `http://localhost:5119/swagger`
- Tests: `dotnet test` (from the `server/` directory) runs the full Application,
  Infrastructure, and API integration test suite.

If `npm start` isn't available in a given checkout, the fallback is two terminals:
`dotnet run` from the API project, and `npm start` from `client/`.

---

## Architecture & design decisions

### Real-time streaming (NDJSON, not WebSocket/SignalR)

Live price streaming is implemented as NDJSON (newline-delimited JSON) over a
single HTTP POST request, rather than a stateful connection like WebSocket or
SignalR.

- **Why NDJSON**: a search is a one-shot, unidirectional flow of results for a
  single request — there's no need for a persistent bidirectional channel, its
  reconnect/ping-pong machinery, or proxy-upgrade concerns. NDJSON keeps it to
  one HTTP request with low latency and no extra protocol layer.
- **How it works**: the Angular client reads the response with the native
  `fetch` API and a `ReadableStream` reader — not `HttpClient`, which buffers the
  whole body before resolving. Each line is parsed, validated against a Zod
  schema, and pushed into the `SearchStore` (SignalStore) as it arrives, so the
  results list grows and re-sorts progressively without flicker or layout shift.
- **Cancellation**: when the client disconnects or starts a new search,
  `HttpContext.RequestAborted` fires, and the resulting `CancellationToken` is
  linked with the server's own 6-second search timeout and passed down to every
  in-flight supplier call — a slow or hanging supplier is cut off cleanly either
  way.

### Database persistence

EF Core + SQLite, with the schema created automatically on first run via `EnsureCreated()` across 3 normalized tables:
1. **`SearchStatuses`**: A lookup table defining valid execution states (`Completed`, `TimedOut`, `Cancelled`).
2. **`SearchRecords`**: Represents an overarching search run (locations, date ranges, selected suppliers, status code FK).
3. **`SupplierResponses`**: Represents individual supplier outcomes tied to a search run (price, response time, success/failure).

### History filtering logic

The **Search status** filter (Completed / Timed out / Cancelled) filters on the
*search run* as a whole, not on any individual supplier's result. This is
intentional: a search can finish as `TimedOut` because one supplier never
responded, while every other supplier in that same search answered successfully.
Filtering by the overall run status — rather than collapsing it into a per-row
outcome — keeps that distinction visible instead of hiding it, which is why the
History table shows **two separate signals per row**: a per-search summary (e.g.
"6/7 responded (Timed out)", shown once per search) and a per-row **Supplier
outcome** pill (Success / Failed / Timeout / Pending / Cancelled) for that
specific supplier's result.

---

## AI tools usage

- **Cursor (Composer 2.5, Agent mode, free tier)** — used throughout development
  for implementation: scaffolding, repetitive boilerplate (EF Core
  configuration, model definitions, component templates), and applying fixes
  once the approach and the bug were already identified.
- **Gemini** — used for architectural discussion: comparing streaming protocols
  (NDJSON vs. SSE vs. WebSocket) before choosing one, structuring the zoneless
  SignalStore pattern in Angular 22, and sanity-checking LINQ query logic.