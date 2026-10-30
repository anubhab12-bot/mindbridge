import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'mb-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="container page center">
      <h1>We couldn't find that page</h1>
      <p class="muted">The link may be out of date, or you may not have access to it.</p>
      <div class="row" style="justify-content: center">
        <a routerLink="/" class="btn">Go home</a>
        <a routerLink="/crisis" class="btn btn-secondary">Get help now</a>
      </div>
    </div>
  `,
})
export class NotFoundPage {}
