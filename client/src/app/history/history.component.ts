import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { endOfDayIso, startOfDayIso } from '../core/common/date-utils';
import { SupplierStore } from '../core/stores/supplier.store';
import { HistoryStore } from './history.store';
import { HistoryFilter, HistorySortBy } from '../shared/models';
import { HistoryFilterComponent } from './history-filter/history-filter.component';
import { HistoryTableComponent } from './history-table/history-table.component';
import {
  EMPTY_HISTORY_FILTER,
  HistoryFilterAction,
  HistoryFilterFormModel,
  HistoryFilterViewModel,
  HistoryTableAction,
  HistoryTableViewModel,
} from './view-models/history.view-models';

/**
 * History feature container: bridges {@link HistoryStore} with filter and table child components.
 * Local filter signals are applied on submit; table actions delegate sort/pagination to the store.
 */
@Component({
  selector: 'app-history',
  imports: [HistoryFilterComponent, HistoryTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history.component.html',
})
export class HistoryComponent {
  protected readonly store = inject(HistoryStore);
  protected readonly supplierStore = inject(SupplierStore);

  private readonly pageSizes = [10, 20, 50, 100];

  protected readonly filterModel = signal<HistoryFilterFormModel>({ ...EMPTY_HISTORY_FILTER });

  protected readonly filterVm = computed<HistoryFilterViewModel>(() => ({
    filterModel: this.filterModel(),
    loading: this.store.loading(),
    suppliers: this.supplierStore.suppliers(),
    suppliersLoading: this.supplierStore.loading(),
    suppliersError: this.supplierStore.error(),
    selectedSupplierCount: this.filterModel().suppliers.length,
  }));

  protected readonly tableVm = computed<HistoryTableViewModel>(() => ({
    rows: this.store.rows(),
    loading: this.store.loading(),
    error: this.store.error(),
    sortBy: this.store.sortBy(),
    sortIndicators: {
      [HistorySortBy.Date]: this.store.sortIndicator(HistorySortBy.Date),
      [HistorySortBy.Route]: this.store.sortIndicator(HistorySortBy.Route),
      [HistorySortBy.Supplier]: this.store.sortIndicator(HistorySortBy.Supplier),
      [HistorySortBy.Price]: this.store.sortIndicator(HistorySortBy.Price),
      [HistorySortBy.ResponseTime]: this.store.sortIndicator(HistorySortBy.ResponseTime),
    },
    result: this.store.result(),
    totalPages: this.store.totalPages(),
    canGoBack: this.store.canGoBack(),
    canGoForward: this.store.canGoForward(),
    rangeStart: this.store.rangeStart(),
    rangeEnd: this.store.rangeEnd(),
    pageSize: this.store.pageSize(),
    pageSizes: this.pageSizes,
  }));

  /** Routes filter child emissions to local model updates or store reload/apply. */
  protected onFilterAction(action: HistoryFilterAction): void {
    switch (action.type) {
      case 'fieldChange':
        this.updateField(action.field, action.value);
        break;
      case 'toggleSupplier':
        this.toggleSupplier(action.name);
        break;
      case 'toggleAllSuppliers':
        this.toggleAllSuppliers(action.checked);
        break;
      case 'apply':
        this.applyFilters();
        break;
      case 'reset':
        this.resetFilters();
        break;
      case 'refresh':
        this.store.reload();
        break;
    }
  }

  /** Delegates column sort and pagination to {@link HistoryStore} methods. */
  protected onTableAction(action: HistoryTableAction): void {
    switch (action.type) {
      case 'sort':
        this.store.updateSort(action.column);
        break;
      case 'page':
        this.store.changePage(action.page);
        break;
      case 'pageSize':
        this.store.changePageSize(action.pageSize);
        break;
    }
  }

  private updateField<K extends keyof HistoryFilterFormModel>(
    field: K,
    value: HistoryFilterFormModel[K],
  ): void {
    this.filterModel.update((model) => ({ ...model, [field]: value }));
  }

  private toggleSupplier(name: string): void {
    const checked = !this.filterModel().suppliers.includes(name);
    this.filterModel.update((model) => ({
      ...model,
      suppliers: checked
        ? [...new Set([...model.suppliers, name])]
        : model.suppliers.filter((supplier) => supplier !== name),
    }));
  }

  private toggleAllSuppliers(checked: boolean): void {
    this.filterModel.update((model) => ({
      ...model,
      suppliers: checked ? [...this.supplierStore.suppliers()] : [],
    }));
  }

  /** Maps local form model to API filter (date boundaries, trimmed strings) and triggers store load. */
  private applyFilters(): void {
    const v = this.filterModel();
    const filter: HistoryFilter = {
      fromLocation: v.fromLocation.trim() || undefined,
      toLocation: v.toLocation.trim() || undefined,
      suppliers: v.suppliers.length > 0 ? [...v.suppliers] : undefined,
      status: v.status || undefined,
      since: startOfDayIso(v.since),
      until: endOfDayIso(v.until),
    };
    this.store.updateFilter(filter);
  }

  private resetFilters(): void {
    this.filterModel.set({ ...EMPTY_HISTORY_FILTER });
    this.applyFilters();
  }
}
