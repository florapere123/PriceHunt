import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SuppliersSchema } from '../../shared/models';
import { APP_CONFIG } from '../config/app-config.token';
import { ApiValidationError } from '../errors/api-validation.error';
import { mapApiValidationError } from '../validation/map-api-validation-error';
import { parseApiResponse } from '../validation/parse-api-response';

export class SupplierApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupplierApiError';
  }
}

/** Fetches the supplier catalogue with Zod boundary validation before data reaches stores. */
@Service()
export class SupplierService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  getSuppliers(): Observable<string[]> {
    return this.http.get<unknown>(`${this.config.api.baseUrl}/suppliers`).pipe(
      map((data) => {
        try {
          return parseApiResponse(SuppliersSchema, data, 'Suppliers list');
        } catch (error) {
          mapApiValidationError(error, (validation) => new SupplierApiError(validation.message));
        }
      }),
    );
  }
}
