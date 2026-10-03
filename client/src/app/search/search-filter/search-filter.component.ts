import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchFilterAction, SearchFilterViewModel } from '../view-models/search.view-models';

/**
 * Presentational search form: route/date fields, supplier multi-select, and submit/cancel actions.
 * Validation state is owned by the parent; this component emits typed actions upward.
 */
@Component({
  selector: 'app-search-filter',
  imports: [FormsModule, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-filter.component.html',
})
export class SearchFilterComponent {
  private static readonly DEFAULT_SKELETON_COUNT = 7;

  /** Read-only view-model projected from the parent container's form and validation state. */
  readonly vm = input.required<SearchFilterViewModel>();

  /** Emits form field changes, supplier toggles, submit, and cancel intents upward. */
  readonly action = output<SearchFilterAction>();

  /** Skeleton pill count derived from known suppliers or a sensible default while loading. */
  protected readonly skeletonPlaceholders = computed(() => {
    const count = this.vm().suppliers.length || SearchFilterComponent.DEFAULT_SKELETON_COUNT;
    return Array.from({ length: count }, (_, i) => i);
  });

  /** Gates field-level error display until the parent enables validation after submit. */
  protected showFieldError(field: string): boolean {
    const viewModel = this.vm();
    return viewModel.showValidationErrors && (viewModel.fieldErrors[field]?.length ?? 0) > 0;
  }

  /** Reflects per-supplier checkbox state from the parent-owned form model. */
  protected isSupplierSelected(name: string): boolean {
    return this.vm().formModel.selectedSuppliers.includes(name);
  }
}
