/**
 * O(1) lookup records mapping search lifecycle enums to Tailwind badge classes and labels.
 * Covers live-search statuses ({@link SearchStatus}) and persisted record statuses ({@link SearchRecordStatus}).
 */
import { SearchRecordStatus } from '../models/common.models';
import { SearchStatus } from '../../search/models/search.models';

interface LiveSearchStatusUi {
  badgeClass: string;
  label: string;
}

const DEFAULT_LIVE_SEARCH_STATUS = SearchStatus.Idle;

const LIVE_SEARCH_STATUS_UI: Record<SearchStatus, LiveSearchStatusUi> = {
  [SearchStatus.Idle]: {
    badgeClass: 'bg-slate-100 text-slate-600',
    label: 'Idle',
  },
  [SearchStatus.Running]: {
    badgeClass: 'bg-blue-50 text-blue-700',
    label: 'Searching',
  },
  [SearchStatus.Completed]: {
    badgeClass: 'bg-green-50 text-green-700',
    label: 'Completed',
  },
  [SearchStatus.TimedOut]: {
    badgeClass: 'bg-amber-50 text-amber-700',
    label: 'Timed out',
  },
  [SearchStatus.Cancelled]: {
    badgeClass: 'bg-slate-100 text-slate-600',
    label: 'Cancelled',
  },
  [SearchStatus.Error]: {
    badgeClass: 'bg-red-50 text-red-700',
    label: 'Error',
  },
};

const SEARCH_RECORD_STATUS_BADGE_BASE =
  'inline-block rounded border px-1.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide';

const DEFAULT_SEARCH_RECORD_STATUS_BADGE_CLASS =
  `${SEARCH_RECORD_STATUS_BADGE_BASE} border-slate-200 bg-slate-100 text-slate-700`;

const SEARCH_RECORD_STATUS_BADGE_CLASS: Record<SearchRecordStatus, string> = {
  [SearchRecordStatus.Running]:
    `${SEARCH_RECORD_STATUS_BADGE_BASE} border-blue-200 bg-blue-50 text-blue-800`,
  [SearchRecordStatus.Completed]:
    `${SEARCH_RECORD_STATUS_BADGE_BASE} border-green-200 bg-green-50 text-green-800`,
  [SearchRecordStatus.TimedOut]:
    `${SEARCH_RECORD_STATUS_BADGE_BASE} border-amber-200 bg-amber-50 text-amber-800`,
  [SearchRecordStatus.Cancelled]:
    `${SEARCH_RECORD_STATUS_BADGE_BASE} border-slate-200 bg-slate-100 text-slate-700`,
};

const SEARCH_RUN_COMPLETION_CLASS = {
  complete: 'mt-1 inline-block text-xs font-medium text-green-700',
  cancelled: 'mt-1 inline-block text-xs font-medium text-slate-600',
  incomplete: 'mt-1 inline-block text-xs font-medium text-amber-700',
} as const;

function liveSearchStatusConfig(status: SearchStatus): LiveSearchStatusUi {
  return LIVE_SEARCH_STATUS_UI[status] ?? LIVE_SEARCH_STATUS_UI[DEFAULT_LIVE_SEARCH_STATUS];
}

/** O(1) lookup: Tailwind classes for live-search lifecycle badges (Search grid). */
export function liveSearchStatusBadgeClass(status: SearchStatus): string {
  return liveSearchStatusConfig(status).badgeClass;
}

/** O(1) lookup: human-readable label for live-search lifecycle badges. */
export function liveSearchStatusLabel(status: SearchStatus): string {
  return liveSearchStatusConfig(status).label;
}

/** O(1) lookup: rectangular bordered badge for persisted search status (History). */
export function searchRecordStatusBadgeClass(code: string): string {
  return SEARCH_RECORD_STATUS_BADGE_CLASS[code as SearchRecordStatus] ?? DEFAULT_SEARCH_RECORD_STATUS_BADGE_CLASS;
}

/** Derives a compact search-run completion label for History (e.g. "6/7 responded (Timed out)"). */
export function searchRunCompletionLabel(
  respondedCount: number,
  totalSuppliersCount: number,
  searchStatusCode: string,
): string {
  if (respondedCount >= totalSuppliersCount) {
    return `${totalSuppliersCount}/${totalSuppliersCount} answered`;
  }

  const reason =
    searchStatusCode === SearchRecordStatus.Cancelled ? 'Cancelled' : 'Timed out';
  return `${respondedCount}/${totalSuppliersCount} responded (${reason})`;
}

/** O(1) lookup: Tailwind classes for the search-run completion label in History. */
export function searchRunCompletionClass(
  respondedCount: number,
  totalSuppliersCount: number,
  searchStatusCode: string,
): string {
  if (respondedCount >= totalSuppliersCount) {
    return SEARCH_RUN_COMPLETION_CLASS.complete;
  }

  if (searchStatusCode === SearchRecordStatus.Cancelled) {
    return SEARCH_RUN_COMPLETION_CLASS.cancelled;
  }

  return SEARCH_RUN_COMPLETION_CLASS.incomplete;
}
