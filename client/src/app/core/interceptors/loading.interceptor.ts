import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/**
 * Tracks in-flight HttpClient requests via {@link LoadingService} signals.
 * `finalize()` guarantees a balanced decrement on success, error, or unsubscribe —
 * no NgZone patching required in zoneless change detection.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  loadingService.beginRequest();

  // finalize runs once when the observable terminates, keeping the counter accurate.
  return next(req).pipe(finalize(() => loadingService.endRequest()));
};
