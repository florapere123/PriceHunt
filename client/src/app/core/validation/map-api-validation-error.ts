import { ApiValidationError } from '../errors/api-validation.error';

/**
 * Translates {@link ApiValidationError} into a domain-specific error (e.g. `HistoryApiError`).
 * All other errors pass through unchanged so unexpected system failures are not swallowed.
 */
export function mapApiValidationError(error: unknown, mapError: (validation: ApiValidationError) => Error): never {
  if (error instanceof ApiValidationError) {
    throw mapError(error);
  }

  throw error;
}
