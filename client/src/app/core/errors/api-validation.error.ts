import { ZodError } from 'zod';

/**
 * Thrown when an API payload fails Zod validation at the HTTP boundary.
 * Captures contract drift (renamed fields, wrong types) before data reaches stores or templates.
 */
export class ApiValidationError extends Error {
  constructor(
    message: string,
    readonly zodError?: ZodError,
  ) {
    super(message);
    this.name = 'ApiValidationError';
  }

  /** Flattened issue messages for diagnostics and user-facing error text. */
  get issueMessages(): string[] {
    return this.zodError?.issues.map((issue) => issue.message) ?? [];
  }
}
