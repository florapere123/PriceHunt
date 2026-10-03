import { SupplierOutcome } from '../../shared/models/common.models';
import { SearchFormModel, SearchRequest, SearchStatus } from '../models/search.models';

/** Per-supplier outcome chip projected from {@link SearchStore} for the live progress bar. */
export interface SupplierChip {
  supplierName: string;
  outcome: SupplierOutcome;
}

/** One row in the live results grid, merging requested suppliers with streamed NDJSON responses. */
export interface SearchResultRow {
  supplierName: string;
  /** ISO 8601 response timestamp from the stream; null until the supplier responds. */
  timestamp: string | null;
  price: number | null;
  responseTimeMs: number | null;
  outcome: SupplierOutcome;
}

/** Read-only projection of form state, validation, and supplier catalogue for {@link SearchFilterComponent}. */
export interface SearchFilterViewModel {
  formModel: SearchFormModel;
  showValidationErrors: boolean;
  fieldErrors: Record<string, string[]>;
  selectedCount: number;
  suppliers: string[];
  suppliersLoading: boolean;
  suppliersError: string | null;
  validationSuccess: boolean;
  isRunning: boolean;
}

/** Discriminated union of user intents emitted upward from the search filter form. */
export type SearchFilterAction =
  | { type: 'fieldChange'; field: keyof SearchFormModel; value: SearchFormModel[keyof SearchFormModel] }
  | { type: 'swapLocations' }
  | { type: 'toggleSupplier'; name: string; checked: boolean }
  | { type: 'toggleAll'; checked: boolean }
  | { type: 'submit' }
  | { type: 'cancel' };

/** Read-only projection of live search progress and result rows for {@link SearchTableComponent}. */
export interface SearchTableViewModel {
  status: SearchStatus;
  statusLabel: string;
  statusBadgeClass: string;
  respondedCount: number;
  totalCount: number;
  elapsedMs: number | null;
  lastRequest: SearchRequest | null;
  isRunning: boolean;
  supplierChips: SupplierChip[];
  successCount: number;
  failedCount: number;
  timeoutCount: number;
  cancelledCount: number;
  error: string | null;
  resultRows: SearchResultRow[];
  bestPriceSupplierName: string | null;
}
