/**
 * Per-request Performance API tracker with UUID-suffixed marks to avoid collisions
 * when multiple concurrent requests share the same method/URL.
 */
export interface HttpPerformanceTracker {
  record(failed?: boolean): void;
  elapsedMs(): number;
}

/** Creates a tracker; marks and measures are cleaned up in `record()` to prevent buffer growth. */
export function createHttpPerformanceTracker(
  enabled: boolean,
  method: string,
  url: string,
): HttpPerformanceTracker {
  const started = performance.now();
  const requestId = crypto.randomUUID();
  const measureName = `http ${method} ${url}`;
  const markStart = enabled ? `${measureName}#${requestId}#start` : undefined;
  const markEnd = enabled ? `${measureName}#${requestId}#end` : undefined;

  if (markStart) {
    performance.mark(markStart);
  }

  return {
    record(failed = false): void {
      if (!markStart || !markEnd) {
        return;
      }

      const name = failed ? `${measureName} (failed)` : measureName;

      try {
        performance.mark(markEnd);
        performance.measure(name, markStart, markEnd);
      } finally {
        // Clear marks/measures after recording to keep the Performance buffer lean.
        performance.clearMarks(markStart);
        performance.clearMarks(markEnd);
        performance.clearMeasures(name);
      }
    },
    elapsedMs(): number {
      return performance.now() - started;
    },
  };
}
