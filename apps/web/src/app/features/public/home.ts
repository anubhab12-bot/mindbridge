import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'mb-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <div class="copy">
          <p class="badge badge-primary">Mental wellness support</p>
          <h1>A calmer place to check in, reflect and find the right support.</h1>
          <p class="lead">
            Track your mood, write privately, talk things through with an AI companion, and book
            sessions with verified mental health professionals, all in one place you control.
          </p>
          <div class="row">
            @if (auth.isAuthenticated()) {
              <a class="btn" [routerLink]="auth.homeFor()">Go to my dashboard</a>
            } @else {
              <a class="btn" routerLink="/register">Create a free account</a>
              <a class="btn btn-secondary" routerLink="/professionals">Browse professionals</a>
            }
          </div>
        </div>
        <aside class="card help" aria-labelledby="help-now">
          <h2 id="help-now">Need help right now?</h2>
          <p>
            If you are thinking about harming yourself or are in danger, please reach out to a
            crisis line or emergency services.
          </p>
          <a class="btn btn-crisis btn-block" routerLink="/crisis">See crisis support</a>
        </aside>
      </div>
    </section>

    <section class="container page">
      <h2 class="center">What you can do here</h2>
      <div class="grid features">
        @for (f of features; track f.title) {
          <article class="card-flat">
            <h3>{{ f.title }}</h3>
            <p class="muted">{{ f.text }}</p>
          </article>
        }
      </div>

      <div class="card trust">
        <h2>Built with care and honesty</h2>
        <ul>
          <li>
            Every professional is checked against their registration before they can see patients.
          </li>
          <li>
            You decide what each professional can see, and you can change your mind at any time.
          </li>
          <li>
            The AI companion is not a therapist. It does not diagnose or suggest medication, and it
            says so.
          </li>
          <li>You can download or delete your data from your privacy settings.</li>
        </ul>
        <a routerLink="/how-it-works">How MindBridge works</a>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .hero {
      background: linear-gradient(160deg, var(--mb-primary-soft), var(--mb-bg) 70%);
      padding: var(--mb-space-7) 0;
    }
    .hero-inner {
      display: grid;
      gap: var(--mb-space-6);
      grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
      align-items: center;
    }
    .lead {
      font-size: 1.15rem;
      color: var(--mb-text-muted);
      max-width: 60ch;
    }
    .features {
      margin: var(--mb-space-5) 0 var(--mb-space-6);
    }
    .trust ul {
      padding-left: 1.2rem;
    }
    @media (max-width: 800px) {
      .hero-inner {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthService);
  protected readonly features = [
    {
      title: 'Daily check-ins',
      text: 'Log how you feel in a few taps and see gentle patterns over time.',
    },
    {
      title: 'Private journal',
      text: 'Write freely with optional prompts. Your entries are encrypted at rest.',
    },
    {
      title: 'AI companion',
      text: 'A supportive listener for difficult moments, with crisis support always one tap away.',
    },
    {
      title: 'Self-help library',
      text: 'Short breathing, grounding and sleep exercises reviewed by our team.',
    },
    {
      title: 'Verified professionals',
      text: 'Find psychiatrists, psychologists and counsellors whose credentials we have checked.',
    },
    { title: 'Secure messaging', text: 'Stay in touch with your care team between sessions.' },
  ];
}
