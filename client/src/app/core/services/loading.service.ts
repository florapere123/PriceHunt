import { Service, computed, signal } from '@angular/core';

/**
 * Global in-flight HTTP counter exposed as a signal for zoneless-friendly templates.
 * Pair with {@link loadingInterceptor} so begin/end stay balanced via RxJS finalize.
 */
@Service()
export class LoadingService {
  private readonly activeRequests = signal(0);

  readonly isLoading = computed(() => this.activeRequests() > 0);

  beginRequest(): void {
    this.activeRequests.update((count) => count + 1);
  }

  /** Math.max guards against counter drift if endRequest fires more than once. */
  endRequest(): void {
    this.activeRequests.update((count) => Math.max(0, count - 1));
  }
}
