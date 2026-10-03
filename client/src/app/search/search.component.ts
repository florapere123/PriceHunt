import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { isoDate } from '../core/common/date-utils';
import { SupplierStore } from '../core/stores/supplier.store';
import { SearchStore } from './search.store';
import { SearchFormModel, SearchFormSchema, SearchRequest, SearchStatus } from '../shared/models';
import {
  liveSearchStatusBadgeClass,
  liveSearchStatusLabel,
} from '../shared/utils/search-status-ui';
import { SearchFilterComponent } from './search-filter/search-filter.component';
import { SearchTableComponent } from './search-table/search-table.component';
import { SearchFilterAction, SearchFilterViewModel, SearchTableViewModel } from './view-models/search.view-models';

/**
 * Live search container: owns form signals, Zod validation, and {@link SearchStore} lifecycle.
 * Starts NDJSON streaming on submit; cancel aborts the in-flight fetch via the store.
 */
@Component({
  selector: 'app-search',
  imports: [SearchFilterComponent, SearchTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search.component.html',
})
export class SearchComponent {
  protected readonly store = inject(SearchStore);
  protected readonly supplierStore = inject(SupplierStore);

  protected readonly formModel = signal<SearchFormModel>({
    fromLocation: '',
    toLocation: '',
    fromDate: isoDate(7),
    toDate: isoDate(14),
    selectedSuppliers: [],
  });

  protected readonly showValidationErrors = signal(false);

  /** Client-side Zod validation; runs reactively as the form model signal changes. */
  protected readonly validation = computed(() => SearchFormSchema.safeParse(this.formModel()));

  protected readonly fieldErrors = computed(() => {
    const result = this.validation();
    if (result.success) {
      return {} as Record<string, string[]>;
    }

    const errors: Record<string, string[]> = {};

    // Map Zod issues to field-keyed error arrays for template display.
    for (const issue of result.error.issues) {
      const fieldName = String(issue.path[0] || 'general');
      if (!errors[fieldName]) {
        errors[fieldName] = [];
      }
      errors[fieldName].push(issue.message);
    }

    return errors;
  });

  /** Projects local form signals and supplier catalogue into the filter child view-model. */
  protected readonly filterVm = computed<SearchFilterViewModel>(() => ({
    formModel: this.formModel(),
    showValidationErrors: this.showValidationErrors(),
    fieldErrors: this.fieldErrors(),
    selectedCount: this.formModel().selectedSuppliers.length,
    suppliers: this.supplierStore.suppliers(),
    suppliersLoading: this.supplierStore.loading(),
    suppliersError: this.supplierStore.error(),
    validationSuccess: this.validation().success,
    isRunning: this.store.isRunning(),
  }));

  /** Projects live NDJSON stream state into the table child; null while idle (no active search). */
  protected readonly tableVm = computed<SearchTableViewModel | null>(() => {
    const status = this.store.status();
    if (status === SearchStatus.Idle) {
      return null;
    }

    return {
      status,
      statusLabel: liveSearchStatusLabel(status),
      statusBadgeClass: liveSearchStatusBadgeClass(status),
      respondedCount: this.store.respondedCount(),
      totalCount: this.store.totalCount(),
      elapsedMs: this.store.elapsedMs(),
      lastRequest: this.store.lastRequest(),
      isRunning: this.store.isRunning(),
      supplierChips: this.store.supplierChips(),
      successCount: this.store.successCount(),
      failedCount: this.store.failedCount(),
      timeoutCount: this.store.timeoutCount(),
      cancelledCount: this.store.cancelledCount(),
      error: this.store.error(),
      resultRows: this.store.resultRows(),
      bestPriceSupplierName: this.store.bestPrice()?.supplierName ?? null,
    };
  });

  private syncedSupplierKey = '';

  constructor() {
    // Auto-select all suppliers once the catalogue loads from SupplierStore.
    effect(() => {
      const names = this.supplierStore.suppliers();
      const key = names.join('\0');
      if (!key || key === this.syncedSupplierKey) {
        return;
      }

      this.formModel.update((model) => ({
        ...model,
        selectedSuppliers: [...names],
      }));
      this.syncedSupplierKey = key;
    });
  }

  /** Routes filter child emissions to local form updates, submit, or store cancel. */
  protected onFilterAction(action: SearchFilterAction): void {
    switch (action.type) {
      case 'fieldChange':
        this.updateField(action.field, action.value);
        break;
      case 'swapLocations':
        this.swapLocations();
        break;
      case 'toggleSupplier':
        this.toggleSupplier(action.name, action.checked);
        break;
      case 'toggleAll':
        this.toggleAll(action.checked);
        break;
      case 'submit':
        this.submit();
        break;
      case 'cancel':
        // AbortController in SearchApiService tears down the NDJSON fetch stream.
        this.store.cancel();
        break;
    }
  }

  private updateField<K extends keyof SearchFormModel>(field: K, value: SearchFormModel[K]): void {
    this.formModel.update((model) => ({ ...model, [field]: value }));
  }

  private toggleSupplier(name: string, checked: boolean): void {
    this.formModel.update((model) => ({
      ...model,
      selectedSuppliers: checked
        ? [...new Set([...model.selectedSuppliers, name])]
        : model.selectedSuppliers.filter((supplier) => supplier !== name),
    }));
  }

  private swapLocations(): void {
    this.formModel.update((model) => ({
      ...model,
      fromLocation: model.toLocation,
      toLocation: model.fromLocation,
    }));
  }

  private toggleAll(checked: boolean): void {
    this.formModel.update((model) => ({
      ...model,
      selectedSuppliers: checked ? [...this.supplierStore.suppliers()] : [],
    }));
  }

  /** Validates via Zod, then hands a typed {@link SearchRequest} to SearchStore.start(). */
  private submit(): void {
    this.showValidationErrors.set(true);

    const result = this.validation();
    if (
      !result.success ||
      this.supplierStore.loading() ||
      this.supplierStore.suppliers().length === 0
    ) {
      return;
    }

    const request: SearchRequest = {
      fromLocation: result.data.fromLocation,
      toLocation: result.data.toLocation,
      fromDate: result.data.fromDate,
      toDate: result.data.toDate,
      selectedSuppliers: result.data.selectedSuppliers,
    };
    // SearchStore.start() opens the NDJSON stream; each line updates results incrementally.
    this.store.start(request);
  }
}
