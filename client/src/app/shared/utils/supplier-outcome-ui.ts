/**
 * O(1) lookup records mapping {@link SupplierOutcome} to chip, pill, and response-badge UI.
 * Shared by live search and history tables for consistent per-supplier visual language.
 */
import { SupplierOutcome } from '../models/common.models';

interface SupplierOutcomeUiConfig {
  chipLabel: string;
  pillLabel: string;
  chipClass: string;
  pillToneClass: string;
}

const SUPPLIER_OUTCOME_PILL_BASE =
  'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold';

const DEFAULT_SUPPLIER_OUTCOME = SupplierOutcome.Pending;

const SUPPLIER_OUTCOME_UI: Record<SupplierOutcome, SupplierOutcomeUiConfig> = {
  [SupplierOutcome.Pending]: {
    chipLabel: 'waiting',
    pillLabel: 'Pending',
    chipClass: 'border-slate-200 bg-slate-100 text-slate-500',
    pillToneClass: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
  },
  [SupplierOutcome.Success]: {
    chipLabel: 'ok',
    pillLabel: 'Success',
    chipClass: 'border-green-200 bg-green-50 text-green-700',
    pillToneClass: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
  },
  [SupplierOutcome.Failed]: {
    chipLabel: 'failed',
    pillLabel: 'Failed',
    chipClass: 'border-red-200 bg-red-50 text-red-700',
    pillToneClass: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  },
  [SupplierOutcome.Timeout]: {
    chipLabel: 'timeout',
    pillLabel: 'Timeout',
    chipClass: 'border-amber-200 bg-amber-50 text-amber-700',
    pillToneClass: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  },
  [SupplierOutcome.Cancelled]: {
    chipLabel: 'cancelled',
    pillLabel: 'Cancelled',
    chipClass: 'border-slate-200 bg-slate-100 text-slate-500',
    pillToneClass: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
  },
};

function supplierOutcomeConfig(outcome: SupplierOutcome): SupplierOutcomeUiConfig {
  return SUPPLIER_OUTCOME_UI[outcome] ?? SUPPLIER_OUTCOME_UI[DEFAULT_SUPPLIER_OUTCOME];
}

/** O(1) lookup: short lowercase labels for supplier outcome chips (Search grid). */
export function supplierOutcomeChipLabel(outcome: SupplierOutcome): string {
  return supplierOutcomeConfig(outcome).chipLabel;
}

/** O(1) lookup: title-case labels for supplier outcome pills (History table). */
export function supplierOutcomePillLabel(outcome: SupplierOutcome): string {
  return supplierOutcomeConfig(outcome).pillLabel;
}

/** O(1) lookup: border and background classes for supplier outcome chips (Search grid). */
export function supplierOutcomeChipClass(outcome: SupplierOutcome): string {
  return supplierOutcomeConfig(outcome).chipClass;
}

/** O(1) lookup: rounded pill classes for per-supplier response outcomes (History & Search tables). */
export function supplierOutcomePillClass(outcome: SupplierOutcome): string {
  return `${SUPPLIER_OUTCOME_PILL_BASE} ${supplierOutcomeConfig(outcome).pillToneClass}`;
}

const SUPPLIER_RESPONSE_UI = {
  success: {
    badgeClass: 'bg-green-50 text-green-700',
    label: 'Success',
  },
  failure: {
    badgeClass: 'bg-red-50 text-red-700',
    label: 'Failed',
  },
} as const;

/** O(1) lookup: Tailwind classes for per-row supplier response success/failure badges. */
export function supplierResponseBadgeClass(isSuccess: boolean): string {
  return isSuccess ? SUPPLIER_RESPONSE_UI.success.badgeClass : SUPPLIER_RESPONSE_UI.failure.badgeClass;
}

/** O(1) lookup: human-readable label for per-row supplier response success/failure. */
export function supplierResponseLabel(isSuccess: boolean): string {
  return isSuccess ? SUPPLIER_RESPONSE_UI.success.label : SUPPLIER_RESPONSE_UI.failure.label;
}
