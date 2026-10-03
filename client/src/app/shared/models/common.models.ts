import { z } from 'zod';

/** Standard server-side pagination envelope shared by history and other list endpoints. */
export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

/** Factory for Zod-validated paged responses at the API boundary. */
export function createPagedResultSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalCount: z.number().int(),
    totalPages: z.number().int(),
  });
}

/** Known persisted search status codes (aligned with server lookup table). */
export enum SearchRecordStatus {
  Running = 'Running',
  Completed = 'Completed',
  TimedOut = 'TimedOut',
  Cancelled = 'Cancelled',
}

/** Nested status object on history rows (code + display name from server lookup). */
export const SearchStatusInfoSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export type SearchStatusInfo = z.infer<typeof SearchStatusInfoSchema>;

/** Per-supplier resolution within a search run (live stream or persisted history row). */
export enum SupplierOutcome {
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed',
  Timeout = 'timeout',
  Cancelled = 'cancelled',
}

export const SupplierOutcomeSchema = z.enum(SupplierOutcome);

/** Zod schema for the `/suppliers` catalogue endpoint. */
export const SuppliersSchema = z.array(z.string());
