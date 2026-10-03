/**
 * Development-only console helpers gated by {@link isDevMode}.
 * Stripped from production bundles via tree-shaking when calls are not reached.
 */
import { isDevMode } from '@angular/core';

/** Logs to the console in development builds only; no-op in production. */
export function devLog(...args: unknown[]): void {
  if (isDevMode()) {
    console.log(...args);
  }
}

/** Warns to the console in development builds only; no-op in production. */
export function devWarn(...args: unknown[]): void {
  if (isDevMode()) {
    console.warn(...args);
  }
}
