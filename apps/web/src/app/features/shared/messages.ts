import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { type CrisisResourcesResponse, Role } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { ToastService } from '../../core/services/toast.service';
import { CrisisPanelComponent } from '../../shared/ui/crisis-panel';
import { EmptyStateComponent, LoadingComponent } from '../../shared/ui/states';

interface Thread {
  id: string;
  counterpart: { id: string; displayName: string; role: string };
  lastMessageAt: string | null;
  unread: number;
  canSend: boolean;
}

interface Message {
  id: string;
  mine: boolean;
  senderRole: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

interface CareMember {
  doctorId: string;
  displayName: string;
  status: string;
}

@Component({
  selector: 'mb-messages',
  imports: [DatePipe, FormsModule, RouterLink, LoadingComponent, EmptyStateComponent, CrisisPanelComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Messages</h1>
        <p>For non-urgent questions between sessions. Replies may take a while.</p>
      </header>
      @if (isPatient()) {
        <div class="alert alert-crisis small">Messages are not monitored around the clock. If you need help now, <a routerLink="/crisis">see crisis contacts</a>.</div>
      }
      @if (!flags.enabled('messaging.enabled')) {
        <div class="alert alert-warning">Messaging is paused at the moment.</div>
      } @else {
        <div class="layout">
          <aside class="card-flat threads" aria-label="Conversations">
            @if (isPatient() && startable().length) {
              <div class="field">
                <label for="start">Start a conversation</label>
                <select id="start" class="input" (change)="start($any($event.target).value); $any($event.target).value = ''">
                  <option value="">Choose a professional…</option>
                  @for (m of startable(); track m.doctorId) { <option [value]="m.doctorId">{{ m.displayName }}</option> }
                </select>
              </div>
            }
            @if (loading()) {
              <mb-loading />
            } @else if (!threads().length) {
              <p class="small muted">No conversations yet. @if (isPatient()) { You can message professionals once you've had a confirmed session. }</p>
            }
            <ul class="thread-list">
              @for (t of threads(); track t.id) {
                <li>
                  <button type="button" class="thread" [class.active]="active()?.id === t.id" (click)="open(t)">
                    <span class="row-between"><strong>{{ t.counterpart.displayName }}</strong> @if (t.unread) { <span class="badge badge-primary">{{ t.unread }}</span> }</span>
                    <span class="small muted">{{ t.lastMessageAt ? (t.lastMessageAt | date: 'short') : 'No messages yet' }}</span>
                  </button>
                </li>
              }
            </ul>
          </aside>

          <section class="card-flat chat">
            @if (!active()) {
              <mb-empty title="Select a conversation" />
            } @else {
              <div class="chat-head"><strong>{{ active()!.counterpart.displayName }}</strong></div>
              <div class="messages" #scroller aria-live="polite">
                @for (m of messages(); track m.id) {
                  <div class="msg" [class.mine]="m.mine">
                    <div class="bubble">{{ m.content }}</div>
                    <div class="small muted">{{ m.createdAt | date: 'short' }}@if (m.mine && m.readAt) { · Read }</div>
                  </div>
                }
              </div>
              @if (safety(); as s) {
                <div class="safety">
                  <p class="small"><strong>{{ s.notice }}</strong></p>
                  <mb-crisis-panel [data]="s.resources" [compact]="true" />
                </div>
              }
              @if (active()!.canSend) {
                <form class="composer" (ngSubmit)="send()">
                  <label for="m" class="visually-hidden">Message</label>
                  <textarea id="m" class="textarea" name="m" rows="3" [(ngModel)]="draft" maxlength="4000"></textarea>
                  <button class="btn" type="submit" [disabled]="sending() || !draft.trim()">Send</button>
                </form>
              } @else {
                <p class="small muted composer">This care relationship has ended, so new messages can't be sent.</p>
              }
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: `.layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: var(--mb-space-4); }
    @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
    .thread-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
    .thread { all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 8px 10px; border-radius: var(--mb-radius-sm); }
    .thread:hover, .thread.active { background: var(--mb-primary-soft); } .thread:focus-visible { outline: 3px solid var(--mb-focus); }
    .chat { padding: 0; display: flex; flex-direction: column; min-height: 55vh; }
    .chat-head { padding: 12px 16px; border-bottom: 1px solid var(--mb-border); }
    .messages { flex: 1; overflow-y: auto; max-height: 55vh; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .msg { max-width: 80%; display: flex; flex-direction: column; gap: 4px; } .msg.mine { align-self: flex-end; align-items: flex-end; }
    .bubble { background: var(--mb-surface-2); padding: 10px 14px; border-radius: 14px; white-space: pre-wrap; }
    .mine .bubble { background: var(--mb-primary); color: var(--mb-on-primary); }
    .composer { border-top: 1px solid var(--mb-border); padding: 12px 16px; display: grid; gap: 8px; justify-items: end; margin: 0; } .composer .textarea { min-height: 70px; }
    .safety { padding: 0 16px 12px; }`,
})
export class MessagesPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly realtime = inject(RealtimeService);
  protected readonly flags = inject(FeatureFlagsService);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  protected readonly isPatient = computed(() => this.auth.role() === Role.PATIENT);
  protected readonly threads = signal<Thread[]>([]);
  protected readonly active = signal<Thread | null>(null);
  protected readonly messages = signal<Message[]>([]);
  protected readonly careTeam = signal<CareMember[]>([]);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly safety = signal<{ notice: string; resources: CrisisResourcesResponse } | null>(null);
  protected readonly startable = computed(() => {
    const open = new Set(this.threads().map((t) => t.counterpart.id));
    return this.careTeam().filter((m) => m.status === 'ACTIVE' && !open.has(m.doctorId));
  });
  protected draft = '';

  constructor() {
    void this.loadThreads();
    if (this.isPatient()) this.api.get<CareMember[]>('/patients/care-team').then((t) => this.careTeam.set(t), () => undefined);
    this.realtime.on(
      'message:new',
      (p) => {
        if (p['threadId'] === this.active()?.id) void this.loadMessages(this.active()!);
        else void this.loadThreads();
      },
      inject(DestroyRef),
    );
  }

  async loadThreads() {
    try {
      this.threads.set(await this.api.get<Thread[]>('/messaging/threads'));
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async start(counterpartId: string) {
    if (!counterpartId) return;
    try {
      const t = await this.api.post<Thread>('/messaging/threads', { counterpartId });
      this.threads.update((l) => [t, ...l.filter((x) => x.id !== t.id)]);
      await this.open(t);
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async open(t: Thread) {
    this.active.set(t);
    this.safety.set(null);
    await this.loadMessages(t);
  }

  async loadMessages(t: Thread) {
    try {
      this.messages.set(await this.api.get<Message[]>(`/messaging/threads/${t.id}/messages`, { limit: 100 }));
      this.scrollDown();
      if (t.unread) {
        await this.api.post(`/messaging/threads/${t.id}/read`);
        this.threads.update((l) => l.map((x) => (x.id === t.id ? { ...x, unread: 0 } : x)));
      }
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async send() {
    const t = this.active();
    const content = this.draft.trim();
    if (!t || !content) return;
    this.sending.set(true);
    try {
      const res = await this.api.post<{ message: Message; safety?: { notice: string; resources: CrisisResourcesResponse } }>(
        `/messaging/threads/${t.id}/messages`,
        { content },
      );
      this.draft = '';
      this.messages.update((m) => [...m, res.message]);
      if (res.safety?.resources) this.safety.set({ notice: res.safety.notice, resources: res.safety.resources });
      this.scrollDown();
    } catch (err) {
      const e = ApiError.from(err);
      this.toast.error(e.message);
      if (e.code === 'CARE_ENDED') this.active.set({ ...t, canSend: false });
    } finally {
      this.sending.set(false);
    }
  }

  private scrollDown() {
    setTimeout(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
