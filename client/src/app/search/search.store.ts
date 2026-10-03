import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, finalize, switchMap, tap } from 'rxjs';
import { APP_CONFIG } from '../core/config/app-config.token';
import { SearchApiService } from './search-api.service';
import { SupplierOutcome } from '../shared/models/common.models';
import { SearchRequest, SearchStatus, SupplierResponse } from './models/search.models';
import { SearchResultRow, SupplierChip } from './view-models/search.view-models';

function outcomeForSupplier(
  response: SupplierResponse | undefined,
  status: SearchStatus,
): SupplierOutcome {
  if (response) {
    return response.isSuccess ? SupplierOutcome.Success : SupplierOutcome.Failed;
  }
  if (status === SearchStatus.Running || status === SearchStatus.Idle) {
    return SupplierOutcome.Pending;
  }
  if (status === SearchStatus.Cancelled) {
    return SupplierOutcome.Cancelled;
  }
  return SupplierOutcome.Timeout;
}

function sortResultRows(rows: SearchResultRow[]): SearchResultRow[] {
  const outcomeRank: Record<SupplierOutcome, number> = {
    [SupplierOutcome.Success]: 0,
    [SupplierOutcome.Failed]: 1,
    [SupplierOutcome.Pending]: 2,
    [SupplierOutcome.Timeout]: 3,
    [SupplierOutcome.Cancelled]: 4,
  };

  return [...rows].sort((a, b) => {
    const byOutcome = outcomeRank[a.outcome] - outcomeRank[b.outcome];
    if (byOutcome !== 0) {
      return byOutcome;
    }

    if (a.outcome === SupplierOutcome.Success && a.price !== null && b.price !== null) {
      return a.price - b.price;
    }

    if (a.responseTimeMs !== null && b.responseTimeMs !== null) {
      return a.responseTimeMs - b.responseTimeMs;
    }

    return a.supplierName.localeCompare(b.supplierName);
  });
}

interface SearchState {
  results: SupplierResponse[];
  status: SearchStatus;
  requestedSuppliers: string[];
  error: string | null;
  lastRequest: SearchRequest | null;
  startedAt: number | null;
  finishedAt: number | null;
}

const initialState: SearchState = {
  results: [],
  status: SearchStatus.Idle,
  requestedSuppliers: [],
  error: null,
  lastRequest: null,
  startedAt: null,
  finishedAt: null,
};

function upsertResponse(current: SupplierResponse[], response: SupplierResponse): SupplierResponse[] {
  const index = current.findIndex((r) => r.supplierName === response.supplierName);
  if (index === -1) {
    return [...current, response];
  }
  const next = [...current];
  next[index] = response;
  return next;
}

function describeError(error: unknown, apiBaseUrl: string): string {
  if (error instanceof TypeError) {
    return `Could not reach the PriceHunt API at ${apiBaseUrl}. Is the server running?`;
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

export const SearchStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    respondedCount: computed(() => store.results().length),
    totalCount: computed(() => store.requestedSuppliers().length),
    isRunning: computed(() => store.status() === SearchStatus.Running),
    progressPercent: computed(() => {
      const total = store.requestedSuppliers().length;
      return total === 0 ? 0 : Math.round((store.results().length / total) * 100);
    }),
    elapsedMs: computed(() => {
      const start = store.startedAt();
      const end = store.finishedAt();
      return start !== null && end !== null ? end - start : null;
    }),
    sortedResults: computed(() =>
      [...store.results()].sort((a, b) => {
        const aPriced = a.isSuccess && a.price !== null;
        const bPriced = b.isSuccess && b.price !== null;
        if (aPriced && bPriced) {
          return a.price! - b.price!;
        }
        if (aPriced !== bPriced) {
          return aPriced ? -1 : 1;
        }
        return a.responseTimeMs - b.responseTimeMs;
      }),
    ),
    supplierChips: computed<SupplierChip[]>(() => {
      const byName = new Map(store.results().map((r) => [r.supplierName.toLowerCase(), r]));
      const status = store.status();
      return store.requestedSuppliers().map((supplierName) => ({
        supplierName,
        outcome: outcomeForSupplier(byName.get(supplierName.toLowerCase()), status),
      }));
    }),
    resultRows: computed<SearchResultRow[]>(() => {
      const byName = new Map(store.results().map((r) => [r.supplierName.toLowerCase(), r]));
      const status = store.status();
      const rows = store.requestedSuppliers().map((supplierName) => {
        const response = byName.get(supplierName.toLowerCase());
        return {
          supplierName,
          timestamp: response?.timestamp ?? null,
          price: response?.price ?? null,
          responseTimeMs: response?.responseTimeMs ?? null,
          outcome: outcomeForSupplier(response, status),
        };
      });
      return sortResultRows(rows);
    }),
    successCount: computed(() => store.results().filter((r) => r.isSuccess).length),
    failedCount: computed(() => store.results().filter((r) => !r.isSuccess).length),
  })),
  withComputed((store) => ({
    bestPrice: computed(() => {
      const best = store.sortedResults()[0];
      return best?.isSuccess && best.price !== null ? best : null;
    }),
    timeoutCount: computed(
      () => store.supplierChips().filter((chip) => chip.outcome === SupplierOutcome.Timeout).length,
    ),
    cancelledCount: computed(
      () => store.supplierChips().filter((chip) => chip.outcome === SupplierOutcome.Cancelled).length,
    ),
  })),
  withMethods((store, api = inject(SearchApiService), config = inject(APP_CONFIG)) => ({
    // rxMethod bridges signal-store actions to RxJS so NDJSON line emissions map cleanly onto patchState.
    // switchMap unsubscribes from the prior stream when a new search starts, which tears down fetch and
    // aborts the in-flight request — matching the server's expectation that only one active search runs per client.
    start: rxMethod<SearchRequest>((request$) =>
      request$.pipe(
        tap((request) =>
          patchState(store, {
            results: [],
            error: null,
            lastRequest: request,
            requestedSuppliers: [...request.selectedSuppliers],
            status: SearchStatus.Running,
            startedAt: Date.now(),
            finishedAt: null,
          }),
        ),
        switchMap((request) =>
          api.search(request).pipe(
            tap((response) =>
              patchState(store, (state) => ({
                results: upsertResponse(state.results, response),
              })),
            ),
            catchError((error: unknown) => {
              if (error instanceof DOMException && error.name === 'AbortError') {
                patchState(store, { status: SearchStatus.Cancelled });
              } else {
                patchState(store, {
                  status: SearchStatus.Error,
                  error: describeError(error, config.api.baseUrl),
                });
              }
              return EMPTY;
            }),
            finalize(() => {
              const respondedCount = store.results().length;
              const totalCount = store.requestedSuppliers().length;
              if (store.status() === SearchStatus.Running) {
                patchState(store, {
                  status:
                    respondedCount < totalCount ? SearchStatus.TimedOut : SearchStatus.Completed,
                  finishedAt: Date.now(),
                });
              } else if (store.finishedAt() === null) {
                patchState(store, { finishedAt: Date.now() });
              }
            }),
          ),
        ),
      ),
    ),
    cancel(): void {
      if (store.status() !== SearchStatus.Running) {
        return;
      }
      api.cancel();
    },
    reset(): void {
      api.cancel();
      patchState(store, initialState);
    },
  })),
);
