import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, type Observable } from 'rxjs';

/** Marker returned by services that already produce `{ data, meta }` (paginated lists). */
export class Paginated<T> {
  constructor(
    public readonly data: T[],
    public readonly meta: { page: number; pageSize: number; total: number; totalPages: number },
  ) {}

  static of<T>(data: T[], total: number, page: number, pageSize: number): Paginated<T> {
    return new Paginated(data, { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  }
}

/** Wraps every successful JSON response in `{ data }` for a consistent client contract. */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (value instanceof StreamableFile) return value;
        if (value instanceof Paginated) return { data: value.data, meta: value.meta };
        return { data: value ?? null };
      }),
    );
  }
}
