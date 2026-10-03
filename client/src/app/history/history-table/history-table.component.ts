import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { HistorySortBy } from '../../shared/models';
import {
  searchRunCompletionClass,
  searchRunCompletionLabel,
} from '../../shared/utils/search-status-ui';
import {
  supplierOutcomePillClass,
  supplierOutcomePillLabel,
} from '../../shared/utils/supplier-outcome-ui';
import { HistoryTableAction, HistoryTableViewModel } from '../view-models/history.view-models';

/**
 * Presentational history grid: server-paginated rows, sortable columns, and supplier outcome pills.
 * Emits sort/page actions upward; all state lives in {@link HistoryStore} via the parent container.
 */
@Component({
  selector: 'app-history-table',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history-table.component.html',
})
export class HistoryTableComponent {
  /** Read-only view-model projected from {@link HistoryStore} by the parent container. */
  readonly vm = input.required<HistoryTableViewModel>();

  /** Emits sort and pagination intents upward for the parent to delegate to the store. */
  readonly action = output<HistoryTableAction>();

  protected readonly HistorySortBy = HistorySortBy;

  /** Dynamic skeleton row count: matches current rows during page transitions, else pageSize. */
  protected readonly skeletonRows = computed(() => {
    const vm = this.vm();
    // Preserve row height during reload; fall back to pageSize on initial load.
    const count = vm.rows.length > 0 ? vm.rows.length : Math.min(vm.pageSize || 5, 10);
    return Array.from({ length: count }, (_, i) => i);
  });
  protected readonly runCompletionLabel = searchRunCompletionLabel;
  protected readonly runCompletionClass = searchRunCompletionClass;
  protected readonly outcomePillLabel = supplierOutcomePillLabel;
  protected readonly outcomePillClass = supplierOutcomePillClass;
}
