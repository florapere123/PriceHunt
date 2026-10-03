import { PagedResult, SearchRecordStatus, SupplierOutcome } from '../../shared/models/common.models';
import { HistoryRow, HistorySortBy } from '../models/history.models';

/** History row enriched with UI-only flags for template rendering (outcome pill, run context). */
export interface HistoryRowUI extends HistoryRow {
  /** Per-supplier outcome from the API, used for outcome pill rendering in the table. */
  uiOutcome: SupplierOutcome;
  /** True for the first row of each search run on the current page (run context is shown once per run). */
  showRunContext: boolean;
}

/** Local filter form shape owned by {@link HistoryComponent} before mapping to API query params. */
export interface HistoryFilterFormModel {
  fromLocation: string;
  toLocation: string;
  suppliers: string[];
  status: SearchRecordStatus | '';
  since: string;
  until: string;
}

/** Read-only projection of filter form state and supplier catalogue for {@link HistoryFilterComponent}. */
export interface HistoryFilterViewModel {
  filterModel: HistoryFilterFormModel;
  loading: boolean;
  suppliers: string[];
  suppliersLoading: boolean;
  suppliersError: string | null;
  selectedSupplierCount: number;
}

/** Discriminated union of user intents emitted upward from the history filter form. */
export type HistoryFilterAction =
  | { type: 'fieldChange'; field: keyof HistoryFilterFormModel; value: HistoryFilterFormModel[keyof HistoryFilterFormModel] }
  | { type: 'toggleSupplier'; name: string }
  | { type: 'toggleAllSuppliers'; checked: boolean }
  | { type: 'apply' }
  | { type: 'reset' }
  | { type: 'refresh' };

/** Read-only projection of paginated history rows, sort state, and pagination controls. */
export interface HistoryTableViewModel {
  rows: HistoryRowUI[];
  loading: boolean;
  error: string | null;
  sortBy: HistorySortBy;
  sortIndicators: Record<HistorySortBy, string>;
  result: PagedResult<HistoryRow> | null;
  totalPages: number;
  canGoBack: boolean;
  canGoForward: boolean;
  rangeStart: number;
  rangeEnd: number;
  pageSize: number;
  pageSizes: number[];
}

/** Discriminated union of sort and pagination intents emitted upward from the history table. */
export type HistoryTableAction =
  | { type: 'sort'; column: HistorySortBy }
  | { type: 'page'; page: number }
  | { type: 'pageSize'; pageSize: number };

export const EMPTY_HISTORY_FILTER: HistoryFilterFormModel = {
  fromLocation: '',
  toLocation: '',
  suppliers: [],
  status: '',
  since: '',
  until: '',
};
