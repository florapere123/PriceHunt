import { Service, signal } from '@angular/core';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'error';
}

const TOAST_AUTO_DISMISS_MS = 5_000;

/**
 * Signal-backed toast queue for global error notifications.
 * Auto-dismiss timers are tracked per toast and cleared on manual dismissal to prevent leaks.
 */
@Service()
export class NotificationService {
  private readonly _toasts = signal<ToastNotification[]>([]);
  private readonly dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly toasts = this._toasts.asReadonly();

  showError(message: string): void {
    const id = crypto.randomUUID();
    this._toasts.update((toasts) => [...toasts, { id, message, type: 'error' }]);

    // Schedule auto-dismiss; timer ref is stored for cleanup on manual dismiss.
    const timerId = setTimeout(() => this.dismiss(id), TOAST_AUTO_DISMISS_MS);
    this.dismissTimers.set(id, timerId);
  }

  /** Removes a toast and cancels its pending auto-dismiss timer if still active. */
  dismiss(id: string): void {
    const timerId = this.dismissTimers.get(id);
    if (timerId !== undefined) {
      clearTimeout(timerId);
      this.dismissTimers.delete(id);
    }

    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
