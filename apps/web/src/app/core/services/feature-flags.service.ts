import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api/api.service';

/** UI toggles only; the API enforces the same flags server-side. */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly api = inject(ApiService);
  readonly flags = signal<Record<string, boolean>>({});

  async load() {
    try {
      this.flags.set(await this.api.get<Record<string, boolean>>('/feature-flags'));
    } catch {
      /* default to the server's decision on each call */
    }
  }

  enabled(key: string): boolean {
    return this.flags()[key] ?? true;
  }
}
