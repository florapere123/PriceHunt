import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { devLog, devWarn } from '../core/common/dev-logger';
import { APP_CONFIG } from '../core/config/app-config.token';
import { mapApiValidationError } from '../core/validation/map-api-validation-error';
import { parseApiResponse } from '../core/validation/parse-api-response';
import { SearchRequest, SupplierResponse, SupplierResponseSchema } from '../shared/models';

export class SearchApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly validationErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'SearchApiError';
  }
}

/** NDJSON streaming via native fetch — HttpClient buffers the full body and cannot emit lines incrementally. */
@Service()
export class SearchApiService {
  private readonly config = inject(APP_CONFIG);
  private controller: AbortController | null = null;

  private get url(): string {
    return `${this.config.api.baseUrl}/search`;
  }

  search(request: SearchRequest): Observable<SupplierResponse> {
    return new Observable<SupplierResponse>((observer) => {
      const controller = new AbortController();
      this.controller = controller;
      const started = performance.now();
      devLog(`[Search] stream started → ${this.url}`);

      void (async () => {
        try {
          const response = await fetch(this.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/x-ndjson',
            },
            body: JSON.stringify(request),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw await this.toApiError(response);
          }
          if (!response.body) {
            throw new SearchApiError('The server returned an empty response body.', response.status);
          }

          await this.readNdJson(response.body, (item) => observer.next(item));
          devLog(`[Search] stream completed in ${(performance.now() - started).toFixed(0)}ms`);
          observer.complete();
        } catch (error) {
          devWarn(`[Search] stream ended in ${(performance.now() - started).toFixed(0)}ms`, error);
          observer.error(error);
        } finally {
          if (this.controller === controller) {
            this.controller = null;
          }
        }
      })();

      return () => {
        controller.abort();
        if (this.controller === controller) {
          this.controller = null;
        }
      };
    });
  }

  cancel(): void {
    this.controller?.abort();
    this.controller = null;
  }

  private async readNdJson(
    body: ReadableStream<Uint8Array>,
    onResponse: (response: SupplierResponse) => void,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          const item = this.parseStreamLine(line);
          if (item) {
            onResponse(item);
          }
        }
      }

      buffer += decoder.decode();
      const trailing = this.parseStreamLine(buffer);
      if (trailing) {
        onResponse(trailing);
      }
    } finally {
      reader.releaseLock();
    }
  }

  private parseStreamLine(line: string): SupplierResponse | null {
    const trimmed = line.trim();
    if (!trimmed) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new SearchApiError('The server returned malformed JSON in the search stream.');
    }

    return this.parseSupplierResponse(parsed);
  }

  /** Validates a single NDJSON stream item at the API boundary. */
  private parseSupplierResponse(data: unknown): SupplierResponse {
    try {
      return parseApiResponse(SupplierResponseSchema, data, 'Supplier response');
    } catch (error) {
      mapApiValidationError(error, (validation) => new SearchApiError(validation.message));
    }
  }

  private async toApiError(response: Response): Promise<SearchApiError> {
    try {
      const problem: unknown = await response.json();
      const errors = this.extractValidationErrors(problem);
      const details = errors ? Object.values(errors).flat().join(' ') : '';
      const title = this.extractProblemTitle(problem);
      return new SearchApiError(
        details || title || `Search failed with HTTP ${response.status}.`,
        response.status,
        errors,
      );
    } catch {
      return new SearchApiError(`Search failed with HTTP ${response.status}.`, response.status);
    }
  }

  private extractValidationErrors(problem: unknown): Record<string, string[]> | undefined {
    if (!problem || typeof problem !== 'object' || !('errors' in problem)) {
      return undefined;
    }

    const errors = (problem as { errors?: unknown }).errors;
    if (!errors || typeof errors !== 'object') {
      return undefined;
    }

    const result: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(errors)) {
      if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
        result[key] = value;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private extractProblemTitle(problem: unknown): string | undefined {
    if (!problem || typeof problem !== 'object' || !('title' in problem)) {
      return undefined;
    }

    const title = (problem as { title?: unknown }).title;
    return typeof title === 'string' ? title : undefined;
  }
}
