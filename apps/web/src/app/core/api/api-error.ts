import { HttpErrorResponse } from '@angular/common/http';

/** Normalised API error. `message` is always safe to show to the user. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }

  static from(err: unknown): ApiError {
    if (err instanceof ApiError) return err;
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { error?: { code?: string; message?: string; details?: unknown } } | null;
      if (err.status === 0) {
        return new ApiError(0, 'NETWORK', 'We could not reach MindBridge. Check your connection and try again.');
      }
      return new ApiError(
        err.status,
        body?.error?.code ?? 'ERROR',
        body?.error?.message ?? 'Something went wrong. Please try again.',
        body?.error?.details,
      );
    }
    return new ApiError(0, 'ERROR', 'Something went wrong. Please try again.');
  }
}

export function errorMessage(err: unknown): string {
  return ApiError.from(err).message;
}
