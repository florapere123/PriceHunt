import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, finalize, switchMap, tap } from 'rxjs';
import { SupplierService } from '../services/supplier.service';

interface SupplierState {
  suppliers: string[];
  loading: boolean;
  error: string | null;
}

const initialState: SupplierState = {
  suppliers: [],
  loading: false,
  error: null,
};

export const SupplierStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, api = inject(SupplierService)) => {
    const loadSuppliers = rxMethod<void>((trigger$) =>
      trigger$.pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          api.getSuppliers().pipe(
            tap((suppliers) => patchState(store, { suppliers })),
            catchError((error: unknown) => {
              patchState(store, {
                error:
                  error instanceof Error ? error.message : 'Failed to load suppliers from the server.',
              });
              return EMPTY;
            }),
            finalize(() => patchState(store, { loading: false })),
          ),
        ),
      ),
    );

    return { loadSuppliers };
  }),
  withHooks({
    onInit(store) {
      store.loadSuppliers();
    },
  }),
);
