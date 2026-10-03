import { z } from 'zod';

/** Typed payload sent to the `/search` NDJSON streaming endpoint. */
export interface SearchRequest {
  fromLocation: string;
  toLocation: string;
  /** ISO 8601 date string (yyyy-MM-dd). */
  fromDate: string;
  /** ISO 8601 date string (yyyy-MM-dd). */
  toDate: string;
  selectedSuppliers: string[];
}

/** Two-way bound form shape for the search filter; validated client-side before submit. */
export interface SearchFormModel {
  fromLocation: string;
  toLocation: string;
  fromDate: string;
  toDate: string;
  selectedSuppliers: string[];
}

/** Zod schema for client-side search form validation (fields, date range, supplier selection). */
export const SearchFormSchema = z
  .object({
    fromLocation: z.string().trim().min(1, 'fromLocation'),
    toLocation: z.string().trim().min(1, 'toLocation'),
    fromDate: z.string().min(1, 'fromDate'),
    toDate: z.string().min(1, 'toDate'),
    selectedSuppliers: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.fromDate && data.toDate && data.toDate < data.fromDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'dateRange',
        path: ['toDate'],
      });
    }

    if (data.selectedSuppliers.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'noSupplier',
        path: ['selectedSuppliers'],
      });
    }
  });

export type SearchFormValue = z.infer<typeof SearchFormSchema>;

/** Zod schema for a single supplier line in the NDJSON search stream. */
export const SupplierResponseSchema = z.object({
  id: z.string(),
  searchRecordId: z.string(),
  supplierName: z.string(),
  price: z.number().nullable(),
  responseTimeMs: z.number(),
  isSuccess: z.boolean(),
  timestamp: z.string(),
});

/** One supplier response emitted incrementally over the NDJSON search stream. */
export type SupplierResponse = z.infer<typeof SupplierResponseSchema>;

/** Lifecycle of a live search as seen by the client. */
export enum SearchStatus {
  Idle = 'idle',
  Running = 'running',
  Completed = 'completed',
  TimedOut = 'timedout',
  Cancelled = 'cancelled',
  Error = 'error',
}
