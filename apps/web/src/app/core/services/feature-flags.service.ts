import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api/api.service';

/** UI toggles only; the API enforces the same flags server-side. */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly api = inject(ApiService);
  readonly flags = signal<Record<string, boolean>>({});

    async load() {
    try {
      const fetchPromise = this.api.get<Record<string, boolean>>('/feature-flags');
      const timeoutPromise = new Promise<Record<string, boolean>>((_, reject) =>
        setTimeout(() => reject(new Error('FeatureFlags timeout')), 2000),
      );
      const res = await Promise.race([fetchPromise, timeoutPromise]);
      if (res && typeof res === 'object') {
        this.flags.set(res);
      }
    } catch {
      /* default to the server's decision on each call */
    }
  }

  enabled(key: string): boolean {
    return this.flags()[key] ?? true;
  }
}
