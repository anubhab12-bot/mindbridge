import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfessionalCategory, SCOPE_OF_PRACTICE } from '@mindbridge/shared-types';

@Component({
  selector: 'mb-how-it-works',
  imports: [RouterLink],
  template: `
    <div class="container page narrow">
      <header class="page-header">
        <h1>How MindBridge works</h1>
        <p>MindBridge brings self-care tools and professional care together, with you in control of your information.</p>
      </header>
      <ol class="steps">
        <li class="card-flat"><h3>Create an account</h3><p class="muted">Sign up with your email. MindBridge is currently for adults (18+).</p></li>
        <li class="card-flat"><h3>Check in and reflect</h3><p class="muted">Log your mood, journal privately and use short self-help exercises.</p></li>
        <li class="card-flat"><h3>Talk it through</h3><p class="muted">The AI companion can listen and suggest coping ideas. It is not a therapist, cannot diagnose and never suggests medication. If you are at risk it will show crisis contacts.</p></li>
        <li class="card-flat"><h3>Book a professional</h3><p class="muted">Choose a verified professional, pick a time and share an optional intake form.</p></li>
        <li class="card-flat"><h3>Stay in control</h3><p class="muted">You choose what each professional can see. You can export or delete your data at any time.</p></li>
      </ol>
      <section class="card">
        <h2>About the AI companion</h2>
        <p>
          Conversations are screened for signs of risk. If something you write suggests you may be in danger, the companion
          switches to a safety-first response and shows verified crisis contacts. It cannot call anyone for you.
        </p>
        <p class="muted small">
          In development and demo environments the companion may use a simulated model; those replies are clearly labelled.
        </p>
      </section>
      <p><a routerLink="/register" class="btn">Get started</a></p>
    </div>
  `,
  styles: `.narrow { max-width: 820px; } .steps { list-style: none; padding: 0; display: grid; gap: var(--mb-space-3); margin-bottom: var(--mb-space-5); }`,
})
export class HowItWorksPage {}

@Component({
  selector: 'mb-for-professionals',
  imports: [RouterLink],
  template: `
    <div class="container page narrow">
      <header class="page-header">
        <h1>For mental health professionals</h1>
        <p>Join MindBridge to offer online and in-person sessions to people looking for support.</p>
      </header>
      <section class="card">
        <h2>How verification works</h2>
        <ol>
          <li>Register with your professional category, registration number and council.</li>
          <li>Upload your registration certificate, degree and a government ID. Files are stored privately.</li>
          <li>Our team checks your registration with the issuing council. This usually takes a few working days.</li>
          <li>Once approved, your profile becomes visible and you can set your availability.</li>
        </ol>
      </section>
      <h2>Scopes of practice</h2>
      <p class="muted">MindBridge shows patients what each category of professional can help with.</p>
      <div class="grid">
        @for (c of categories; track c) {
          <article class="card-flat">
            <h3>{{ scope[c].label }}</h3>
            <p class="small muted">{{ scope[c].description }}</p>
            <p class="small">{{ scope[c].services.join(' · ') }}</p>
          </article>
        }
      </div>
      <section class="card-flat ai">
        <h2>AI drafting tools</h2>
        <p class="muted">
          Verified professionals can ask for AI drafts such as note outlines or intake summaries, only with the patient's
          consent. Every draft is labelled for your review and is never saved to the record unless you choose to.
        </p>
      </section>
      <p><a routerLink="/register" [queryParams]="{ role: 'DOCTOR' }" class="btn">Apply as a professional</a></p>
    </div>
  `,
  styles: `.narrow { max-width: 920px; } .ai { margin: var(--mb-space-5) 0; }`,
})
export class ForProfessionalsPage {
  protected readonly scope = SCOPE_OF_PRACTICE;
  protected readonly categories = Object.values(ProfessionalCategory);
}
