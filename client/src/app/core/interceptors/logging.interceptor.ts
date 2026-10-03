import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { createHttpPerformanceTracker } from '../common/http-performance';
import { devLog, devWarn } from '../common/dev-logger';
import { APP_CONFIG } from '../config/app-config.token';
import { NotificationService } from '../services/notification.service';

/**
 * Surfaces only infrastructure-level failures (network down, server 5xx).
 * 4xx responses are left to feature layers so validation messages stay contextual.
 */
function notifyHttpError(notificationService: NotificationService, error: HttpErrorResponse): void {
  if (error.status === 0) {
    notificationService.showError(
      'Could not reach the server. Please check your connection and try again.',
    );
    return;
  }

  if (error.status >= 500) {
    notificationService.showError(
      `A server error occurred (${error.status}). Please try again later.`,
    );
  }
}

/**
 * Records per-request performance marks/measures and optional dev-console logs.
 * Errors are always re-thrown so downstream stores can handle them after toast notification.
 */
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(APP_CONFIG);
  const notificationService = inject(NotificationService);
  const tracker = createHttpPerformanceTracker(
    config.features.enablePerformanceMetrics,
    req.method,
    req.url,
  );

  return next(req).pipe(
    tap((event) => {
      if (event.type !== HttpEventType.Response) {
        return;
      }

      tracker.record();

      if (config.features.enableConsoleLogging) {
        devLog(
          `[HTTP] ${req.method} ${req.url} → ${event.status} (${tracker.elapsedMs().toFixed(0)}ms)`,
        );
      }
    }),
    catchError((error: unknown) => {
      tracker.record(true);
      devWarn(`[HTTP] ${req.method} ${req.url} failed (${tracker.elapsedMs().toFixed(0)}ms)`, error);

      if (error instanceof HttpErrorResponse) {
        notifyHttpError(notificationService, error);
      }

      // Propagate unchanged so feature stores retain full error context.
      return throwError(() => error);
    }),
  );
};
