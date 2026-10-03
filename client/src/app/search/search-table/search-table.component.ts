import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { SearchStatus, SupplierOutcome } from '../../shared/models';
import {
  supplierOutcomeChipClass,
  supplierOutcomeChipLabel,
  supplierOutcomePillClass,
  supplierOutcomePillLabel,
} from '../../shared/utils/supplier-outcome-ui';
import { SearchTableViewModel } from '../view-models/search.view-models';

/**
 * Live search results grid fed by NDJSON stream state in {@link SearchStore}.
 * Renders progressive supplier responses, outcome chips, and price-sorted result rows.
 */
@Component({
  selector: 'app-search-table',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-table.component.html',
})
export class SearchTableComponent {
  /** Read-only view-model projected from {@link SearchStore} by the parent container. */
  readonly vm = input.required<SearchTableViewModel>();

  protected readonly SearchStatus = SearchStatus;
  protected readonly SupplierOutcome = SupplierOutcome;
  protected readonly outcomeChipLabel = supplierOutcomeChipLabel;
  protected readonly outcomeChipClass = supplierOutcomeChipClass;
  protected readonly outcomePillLabel = supplierOutcomePillLabel;
  protected readonly outcomePillClass = supplierOutcomePillClass;
}
