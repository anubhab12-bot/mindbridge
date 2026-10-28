import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'mb-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="container row-between">
        <a routerLink="/" class="brand" aria-label="MindBridge home">
          <span class="logo" aria-hidden="true">◐</span> MindBridge
        </a>
        <nav class="nav" aria-label="Main">
          <a routerLink="/self-help" routerLinkActive="active">Self-help</a>
          <a routerLink="/professionals" routerLinkActive="active">Find a professional</a>
          <a routerLink="/for-professionals" routerLinkActive="active">For professionals</a>
          <a routerLink="/how-it-works" routerLinkActive="active">How it works</a>
        </nav>
        <div class="row">
          <a routerLink="/crisis" class="btn btn-crisis btn-sm">Get help now</a>
          @if (auth.isAuthenticated()) {
            <a [routerLink]="auth.homeFor()" class="btn btn-sm">My dashboard</a>
          } @else {
            <a routerLink="/login" class="btn btn-ghost btn-sm">Sign in</a>
            <a routerLink="/register" class="btn btn-sm">Get started</a>
          }
        </div>
      </div>
    </header>
    <main id="main" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer">
      <div class="container">
        <p class="disclaimer">
          MindBridge offers emotional support, self-help tools and access to verified professionals.
          It is not an emergency service and does not diagnose or prescribe. If you are in immediate
          danger, call your local emergency number or
          <a routerLink="/crisis">see crisis support</a>.
        </p>
        <nav class="row small" aria-label="Footer">
          <a routerLink="/legal/privacy">Privacy notice</a>
          <a routerLink="/legal/terms">Terms</a>
          <a routerLink="/legal/ai">How we use AI</a>
          <a routerLink="/crisis">Crisis support</a>
        </nav>
      </div>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .site-header {
      background: var(--mb-surface);
      border-bottom: 1px solid var(--mb-border);
      padding: 12px 0;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand {
      font-weight: 750;
      font-size: 1.2rem;
      text-decoration: none;
      color: var(--mb-text);
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }
    .logo {
      color: var(--mb-primary);
      font-size: 1.4rem;
    }
    .nav {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
    }
    .nav a {
      color: var(--mb-text-muted);
      text-decoration: none;
      font-weight: 500;
    }
    .nav a.active,
    .nav a:hover {
      color: var(--mb-primary);
    }
    main:focus {
      outline: none;
    }
    .site-footer {
      border-top: 1px solid var(--mb-border);
      padding: var(--mb-space-5) 0;
      background: var(--mb-surface);
      margin-top: var(--mb-space-7);
    }
    .disclaimer {
      color: var(--mb-text-muted);
      max-width: 80ch;
      font-size: 0.9rem;
    }
    @media (max-width: 860px) {
      .nav {
        display: none;
      }
    }
  `,
})
export class PublicLayoutComponent {
  protected readonly auth = inject(AuthService);
}
