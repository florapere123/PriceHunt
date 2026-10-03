import { z } from 'zod';
import {
  createPagedResultSchema,
  SearchRecordStatus,
  SearchStatusInfoSchema,
  SupplierOutcomeSchema,
} from '../../shared/models/common.models';

/** One history row per selected supplier; supplier fields are null only when the search has no responses at all. */
export const HistoryRowSchema = z.object({
  searchId: z.string(),
  createdAt: z.string(),
  fromLocation: z.string(),
  toLocation: z.string(),
  supplierName: z.string().nullable(),
  price: z.number().nullable(),
  responseTimeMs: z.number().nullable(),
  isSuccess: z.boolean().nullable(),
  supplierOutcome: SupplierOutcomeSchema,
  searchStatus: SearchStatusInfoSchema,
  respondedCount: z.number().int().nonnegative(),
  totalSuppliersCount: z.number().int().positive(),
});

export type HistoryRow = z.infer<typeof HistoryRowSchema>;

export const PagedHistoryRowSchema = createPagedResultSchema(HistoryRowSchema);

export type PagedHistoryRow = z.infer<typeof PagedHistoryRowSchema>;

export enum HistorySortBy {
  Date = 'date',
  Route = 'route',
  Supplier = 'supplier',
  Price = 'price',
  ResponseTime = 'responseTime',
}

export const HistorySortBySchema = z.enum(HistorySortBy);

export enum HistorySortDir {
  Asc = 'asc',
  Desc = 'desc',
}

export const HistorySortDirSchema = z.enum(HistorySortDir);

export interface HistoryFilter {
  fromLocation?: string;
  toLocation?: string;
  status?: SearchRecordStatus | '';
  suppliers?: string[];
  since?: string;
  until?: string;
  page?: number;
  pageSize?: number;
  sortBy?: HistorySortBy;
  sortDir?: HistorySortDir;
}
