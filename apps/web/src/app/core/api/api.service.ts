import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiResponse, PageMeta } from '@mindbridge/shared-types';
import { firstValueFrom } from 'rxjs';
import { ApiError } from './api-error';

export const API_BASE = '/api/v1';

type Params = Record<string, string | number | boolean | undefined | null>;

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

function toParams(params?: Params): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
  }
  return p;
}

/** Thin promise-based client that unwraps the `{ data, meta }` envelope and normalises errors. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  private async run<T>(req: Promise<ApiResponse<T> | null>): Promise<T> {
    try {
      const res = await req;
      return (res?.data ?? null) as T;
    } catch (err) {
      throw ApiError.from(err);
    }
  }

  get<T>(path: string, params?: Params): Promise<T> {
    return this.run(firstValueFrom(this.http.get<ApiResponse<T>>(API_BASE + path, { params: toParams(params) })));
  }

  async page<T>(path: string, params?: Params): Promise<Page<T>> {
    try {
      const res = await firstValueFrom(this.http.get<ApiResponse<T[]>>(API_BASE + path, { params: toParams(params) }));
      return { items: res.data, meta: res.meta ?? { page: 1, pageSize: res.data.length, total: res.data.length, totalPages: 1 } };
    } catch (err) {
      throw ApiError.from(err);
    }
  }

  post<T>(path: string, body: unknown = {}): Promise<T> {
    return this.run(firstValueFrom(this.http.post<ApiResponse<T>>(API_BASE + path, body)));
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.run(firstValueFrom(this.http.patch<ApiResponse<T>>(API_BASE + path, body)));
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.run(firstValueFrom(this.http.put<ApiResponse<T>>(API_BASE + path, body)));
  }

  delete<T = void>(path: string): Promise<T> {
    return this.run(firstValueFrom(this.http.delete<ApiResponse<T>>(API_BASE + path)));
  }

  upload<T>(path: string, form: FormData): Promise<T> {
    return this.run(firstValueFrom(this.http.post<ApiResponse<T>>(API_BASE + path, form)));
  }

  /** Accepts an API path ("/privacy/...") or a same-origin signed URL the API returned ("/api/v1/files/..."). */
  async download(path: string): Promise<Blob> {
    const url = path.startsWith(API_BASE + '/') ? path : API_BASE + path;
    try {
      return await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
    } catch (err) {
      throw ApiError.from(err);
    }
  }
}
