import { Component, input, output } from '@angular/core';
import type { PageMeta } from '@mindbridge/shared-types';

@Component({
  selector: 'mb-pagination',
  template: `
    @if (meta(); as m) {
      @if (m.totalPages > 1) {
        <nav class="row pager" aria-label="Pagination">
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="m.page <= 1" (click)="page.emit(m.page - 1)">Previous</button>
          <span class="small muted">Page {{ m.page }} of {{ m.totalPages }}</span>
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="m.page >= m.totalPages" (click)="page.emit(m.page + 1)">Next</button>
        </nav>
      }
    }
  `,
  styles: `.pager { justify-content: center; margin-top: var(--mb-space-4); }`,
})
export class PaginationComponent {
  readonly meta = input<PageMeta | null>(null);
  readonly page = output<number>();
}
