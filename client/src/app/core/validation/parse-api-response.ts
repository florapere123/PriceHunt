import { z } from 'zod';
import { ApiValidationError } from '../errors/api-validation.error';

/**
 * Validates untyped JSON at the API boundary before it reaches store or UI code.
 * Runtime checks catch contract drift (renamed fields, wrong types) early with a
 * single, searchable error type instead of silent undefined access downstream.
 */
export function parseApiResponse<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ApiValidationError(`${context}: response did not match expected shape.`, result.error);
  }

  return result.data;
}
