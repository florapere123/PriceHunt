import { computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, finalize, switchMap, tap } from 'rxjs';
import { APP_CONFIG } from '../core/config/app-config.token';
import { HistoryApiService } from './history-api.service';
import { PagedResult, SupplierOutcome } from '../shared/models/common.models';
import { HistoryFilter, HistoryRow, HistorySortBy, HistorySortDir } from './models/history.models';
import { HistoryRowUI } from './view-models/history.view-models';

interface HistoryState {
  filter: HistoryFilter;
  sortBy: HistorySortBy;
  sortDir: HistorySortDir;
  page: number;
  pageSize: number;
  result: PagedResult<HistoryRow> | null;
  loading: boolean;
  error: string | null;
}

const initialState: HistoryState = {
  filter: {},
  sortBy: HistorySortBy.Date,
  sortDir: HistorySortDir.Desc,
  page: 1,
  pageSize: 20,
  result: null,
  loading: false,
  error: null,
};

function describeError(err: unknown, apiBaseUrl: string): string {
  if (err instanceof HttpErrorResponse) {
    return err.status === 0
      ? `Could not reach the PriceHunt API at ${apiBaseUrl}. Is the server running?`
      : `Failed to load history (HTTP ${err.status}).`;
  }
  return err instanceof Error ? err.message : 'Failed to load history.';
}

export const HistoryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    totalPages: computed(() => Math.max(1, store.result()?.totalPages ?? 1)),
    canGoBack: computed(() => !store.loading() && (store.result()?.page ?? 1) > 1),
    canGoForward: computed(
      () => !store.loading() && (store.result()?.page ?? 1) < Math.max(1, store.result()?.totalPages ?? 1),
    ),
    rangeStart: computed(() => {
      const result = store.result();
      return result && result.totalCount > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
    }),
    rangeEnd: computed(() => {
      const result = store.result();
      return result ? Math.min(result.page * result.pageSize, result.totalCount) : 0;
    }),
    /** Server-ordered rows with UI outcome labels; per-supplier outcome comes from the API, not search status. */
    rows: computed<HistoryRowUI[]>(() => {
      const seenSearchIds = new Set<string>();
      return (store.result()?.items ?? []).map((item) => {
        const showRunContext = !seenSearchIds.has(item.searchId);
        seenSearchIds.add(item.searchId);
        return {
          ...item,
          uiOutcome: item.supplierOutcome,
          showRunContext,
        };
      });
    }),
  })),
  withMethods((store, api = inject(HistoryApiService), config = inject(APP_CONFIG)) => {
    const loadHistory = rxMethod<void>((trigger$) =>
      trigger$.pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          api
            .getHistory({
              ...store.filter(),
              sortBy: store.sortBy(),
              sortDir: store.sortDir(),
              page: store.page(),
              pageSize: store.pageSize(),
            })
            .pipe(
              tap((result) => {
                if (result.items.length === 0 && result.totalCount > 0 && result.page > 1) {
                  patchState(store, { page: Math.max(1, result.totalPages) });
                  loadHistory();
                  return;
                }
                patchState(store, { result });
              }),
              catchError((err: unknown) => {
                patchState(store, { error: describeError(err, config.api.baseUrl) });
                return EMPTY;
              }),
              finalize(() => patchState(store, { loading: false })),
            ),
        ),
      ),
    );

    return {
      loadHistory,
      reload(): void {
        loadHistory();
      },
      updateFilter(filter: HistoryFilter): void {
        patchState(store, {
          filter: {
            ...filter,
            suppliers: filter.suppliers?.length ? [...filter.suppliers] : undefined,
          },
          page: 1,
        });
        loadHistory();
      },
      changePage(page: number): void {
        const target = Math.min(Math.max(1, page), store.totalPages());
        if (target === store.result()?.page) {
          return;
        }
        patchState(store, { page: target });
        loadHistory();
      },
      changePageSize(pageSize: number): void {
        patchState(store, { pageSize, page: 1 });
        loadHistory();
      },
      updateSort(column: HistorySortBy): void {
        if (column === store.sortBy()) {
          patchState(store, {
            sortDir:
              store.sortDir() === HistorySortDir.Asc ? HistorySortDir.Desc : HistorySortDir.Asc,
          });
        } else {
          patchState(store, {
            sortBy: column,
            sortDir: column === HistorySortBy.Date ? HistorySortDir.Desc : HistorySortDir.Asc,
          });
        }
        patchState(store, { page: 1 });
        loadHistory();
      },
      sortIndicator(column: HistorySortBy): string {
        return store.sortBy() === column
          ? store.sortDir() === HistorySortDir.Asc
            ? '▲'
            : '▼'
          : '';
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadHistory();
    },
  }),
);
