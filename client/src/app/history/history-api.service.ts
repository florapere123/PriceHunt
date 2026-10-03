import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { APP_CONFIG } from '../core/config/app-config.token';
import { mapApiValidationError } from '../core/validation/map-api-validation-error';
import { parseApiResponse } from '../core/validation/parse-api-response';
import {
  HistoryFilter,
  HistoryRow,
  PagedHistoryRowSchema,
  PagedResult,
} from '../shared/models';

export class HistoryApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HistoryApiError';
  }
}

@Service()
export class HistoryApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  private get url(): string {
    return `${this.config.api.baseUrl}/history`;
  }

  getHistory(filter: HistoryFilter = {}): Observable<PagedResult<HistoryRow>> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null && item !== '') {
            params = params.append(key, String(item));
          }
        }
        continue;
      }

      params = params.set(key, String(value));
    }

    return this.http.get<unknown>(this.url, { params }).pipe(
      map((data) => {
        try {
          return parseApiResponse(PagedHistoryRowSchema, data, 'History page');
        } catch (error) {
          mapApiValidationError(error, (validation) => new HistoryApiError(validation.message));
        }
      }),
    );
  }
}
