import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchRecordStatus } from '../../shared/models';
import { HistoryFilterAction, HistoryFilterViewModel } from '../view-models/history.view-models';

/**
 * Presentational filter form for history queries.
 * Field changes and supplier toggles emit actions; the parent applies filters to {@link HistoryStore}.
 */
@Component({
  selector: 'app-history-filter',
  imports: [FormsModule, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history-filter.component.html',
})
export class HistoryFilterComponent {
  private static readonly DEFAULT_SKELETON_COUNT = 7;

  /** Read-only view-model projected from the parent container's local filter state. */
  readonly vm = input.required<HistoryFilterViewModel>();

  /** Emits filter field changes, supplier toggles, and apply/reset/refresh intents upward. */
  readonly action = output<HistoryFilterAction>();

  protected readonly SearchRecordStatus = SearchRecordStatus;

  /** Skeleton pill count derived from known suppliers or a sensible default while loading. */
  protected readonly skeletonPlaceholders = computed(() => {
    const count = this.vm().suppliers.length || HistoryFilterComponent.DEFAULT_SKELETON_COUNT;
    return Array.from({ length: count }, (_, i) => i);
  });

  /** Reflects multi-select supplier checkbox state from the parent-owned filter model. */
  protected isSupplierSelected(name: string): boolean {
    return this.vm().filterModel.suppliers.includes(name);
  }
}
