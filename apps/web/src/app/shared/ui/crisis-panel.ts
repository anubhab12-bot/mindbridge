import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import type { CrisisResourcesResponse } from '@mindbridge/shared-types';

/**
 * Renders verified crisis contacts from the registry. Numbers are shown exactly as stored and
 * linked with tel: so they can be tapped on a phone. Always shows the general fallback advice.
 */
@Component({
  selector: 'mb-crisis-panel',
  imports: [DatePipe],
  template: `
    <section class="crisis" [class.compact]="compact()" aria-labelledby="crisis-title" role="region">
      <h2 id="crisis-title" class="crisis-title">{{ title() }}</h2>
      <p class="advice"><strong>{{ data()?.fallbackAdvice }}</strong></p>
      @if (data()?.resources?.length) {
        <ul class="resources">
          @for (r of data()!.resources; track r.id) {
            <li class="resource">
              <div class="name">{{ r.name }}</div>
              <div class="contacts">
                @if (r.phone) {
                  <a class="btn btn-crisis btn-sm" [href]="dial('tel', r.phone)">Call {{ r.phone }}</a>
                }
                @if (r.sms) {
                  <a class="btn btn-secondary btn-sm" [href]="dial('sms', r.sms)">Text {{ r.sms }}</a>
                }
                @if (r.url) {
                  <a class="btn btn-secondary btn-sm" [href]="r.url" target="_blank" rel="noopener noreferrer">Website</a>
                }
              </div>
              <div class="meta small muted">
                {{ r.availability }}
                @if (r.languages.length) { · {{ r.languages.join(', ') }} }
              </div>
              @if (!compact() && r.description) {
                <p class="small">{{ r.description }}</p>
              }
              @if (!compact()) {
                <div class="small muted">
                  Verified {{ r.verifiedAt | date: 'mediumDate' }} against
                  <a [href]="r.sourceUrl" target="_blank" rel="noopener noreferrer">the official source</a>.
                </div>
              }
            </li>
          }
        </ul>
      } @else if (data()) {
        <p class="small muted">We don't have a verified crisis line for your location yet.</p>
      }
      <p class="small muted note">MindBridge is not an emergency service and cannot contact anyone on your behalf.</p>
    </section>
  `,
  styles: `
    .crisis { background: var(--mb-crisis-soft); border: 1px solid var(--mb-crisis); border-radius: var(--mb-radius); padding: var(--mb-space-5); }
    .compact { padding: var(--mb-space-4); }
    .crisis-title { color: var(--mb-crisis); font-size: 1.15rem; }
    .resources { list-style: none; padding: 0; margin: var(--mb-space-3) 0; display: grid; gap: var(--mb-space-3); }
    .resource { background: var(--mb-surface); border-radius: var(--mb-radius-sm); padding: var(--mb-space-3) var(--mb-space-4); }
    .name { font-weight: 650; margin-bottom: 6px; }
    .contacts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .note { margin: 0; }
  `,
})
export class CrisisPanelComponent {
  readonly data = input<CrisisResourcesResponse | null | undefined>(null);
  readonly compact = input(false);
  readonly title = input('If you need help right now');

  protected dial(scheme: 'tel' | 'sms', number: string) {
    return `${scheme}:${number.replace(/[^0-9+]/g, '')}`;
  }
}
