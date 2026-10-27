import { inject, Injectable, signal } from '@angular/core';
import type { CrisisResourcesResponse } from '@mindbridge/shared-types';
import { ApiService } from '../api/api.service';

const OFFLINE_FALLBACK: CrisisResourcesResponse = {
  country: '',
  resources: [],
  fallbackAdvice:
    'If you might act on thoughts of harming yourself, or someone is in immediate danger, call your local emergency number or go to the nearest hospital emergency department now.',
};

/**
 * Verified crisis contacts come only from the admin-maintained registry via the API.
 * Nothing here hardcodes a phone number; if the API is unreachable we show generic advice.
 */
@Injectable({ providedIn: 'root' })
export class CrisisService {
  private readonly api = inject(ApiService);
  private readonly cache = new Map<string, CrisisResourcesResponse>();
  readonly current = signal<CrisisResourcesResponse | null>(null);
  readonly loading = signal(false);

  async load(country = 'IN'): Promise<CrisisResourcesResponse> {
    const key = country.toUpperCase();
    const cached = this.cache.get(key);
    if (cached) {
      this.current.set(cached);
      return cached;
    }
    this.loading.set(true);
    try {
      const res = await this.api.get<CrisisResourcesResponse>('/crisis-resources', { country: key });
      this.cache.set(key, res);
      this.current.set(res);
      return res;
    } catch {
      this.current.set(OFFLINE_FALLBACK);
      return OFFLINE_FALLBACK;
    } finally {
      this.loading.set(false);
    }
  }
}
