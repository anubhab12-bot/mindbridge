import { DatePipe } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  type AiChatMessage,
  ConsentType,
  type CrisisResourcesResponse,
} from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { CrisisPanelComponent } from '../../shared/ui/crisis-panel';
import { LoadingComponent } from '../../shared/ui/states';

interface Conversation {
  id: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  hasSummary: boolean;
  createdAt: string;
}

interface SendResult {
  userMessage: AiChatMessage;
  reply: AiChatMessage;
  quota: { used: number; limit: number };
}

interface HumanSupport {
  resources: CrisisResourcesResponse;
  careTeam: { doctorId: string; displayName: string }[];
  careTeamNotified: number;
  bookingLink: string;
}

@Component({
  selector: 'mb-companion',
  imports: [FormsModule, DatePipe, RouterLink, CrisisPanelComponent, LoadingComponent],
  template: `
    <div class="page companion">
      <header class="row-between head">
        <div>
          <h1>AI companion</h1>
          <p class="small muted">
            A supportive listener. Not a therapist, and not for emergencies.
          </p>
        </div>
        <div class="row">
          <a routerLink="/crisis" class="btn btn-crisis btn-sm">Get help now</a>
          <button type="button" class="btn btn-secondary btn-sm" (click)="humanSupport()">
            Talk to a person
          </button>
        </div>
      </header>

      @if (consentNeeded()) {
        <section class="card consent">
          <h2>Before you start</h2>
          <p>To reply, the companion needs to process what you write. Here is what that means:</p>
          <ul>
            <li>
              Your messages are sent to an AI model to generate a reply. Your name and email are not
              sent.
            </li>
            <li>
              Messages are checked for signs of risk so we can show crisis support when it might
              help.
            </li>
            <li>
              Conversations are encrypted and kept for a limited time. You can delete them at any
              time.
            </li>
            <li>The companion cannot diagnose, prescribe, or contact anyone for you.</li>
          </ul>
          <p class="small"><a routerLink="/legal/ai" target="_blank">Read the full AI notice</a></p>
          <button class="btn" type="button" (click)="grantConsent()" [disabled]="busy()">
            I understand, continue
          </button>
        </section>
      } @else if (unavailable()) {
        <div class="alert alert-warning">{{ unavailable() }}</div>
      } @else {
        <div class="layout">
          <aside class="conversations card-flat" aria-label="Conversations">
            <button
              type="button"
              class="btn btn-block btn-sm"
              (click)="newConversation()"
              [disabled]="busy()"
            >
              New conversation
            </button>
            <ul class="conv-list">
              @for (c of conversations(); track c.id) {
                <li>
                  <button
                    type="button"
                    class="conv"
                    [class.active]="c.id === active()?.id"
                    (click)="select(c)"
                  >
                    <span>{{ c.title || 'Conversation' }}</span>
                    <span class="small muted">{{
                      c.lastMessageAt ?? c.createdAt | date: 'mediumDate'
                    }}</span>
                  </button>
                </li>
              }
            </ul>
          </aside>

          <section class="chat card-flat">
            @if (!active()) {
              <div class="empty">
                <h2>How are you feeling?</h2>
                <p class="muted">Start a new conversation whenever you're ready.</p>
              </div>
            } @else {
              <div class="chat-head row-between">
                <strong>{{ active()!.title || 'Conversation' }}</strong>
                <div class="row">
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    (click)="summarize()"
                    [disabled]="busy()"
                  >
                    Summarise
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="deleteConversation()">
                    Delete
                  </button>
                </div>
              </div>
              @if (summary(); as s) {
                <div class="alert alert-info small">
                  <strong>Summary</strong>
                  @if (s.isMock) {
                    <span class="badge badge-warning">Simulated</span>
                  }
                  <p class="pre">{{ s.summary }}</p>
                </div>
              }
              <div class="messages" #scroller aria-live="polite" aria-relevant="additions">
                @if (loadingMessages()) {
                  <mb-loading [lines]="3" />
                }
                @for (m of messages(); track m.id) {
                  <div
                    class="msg"
                    [class.user]="m.role === 'user'"
                    [class.notice]="m.role === 'notice'"
                  >
                    <div class="bubble">
                      @if (m.role === 'assistant' && m.isMock) {
                        <span
                          class="badge badge-warning mock"
                          title="This reply came from a development mock, not a real AI model."
                          >Simulated reply (mock)</span
                        >
                      }
                      <div class="pre">{{ m.content }}</div>
                    </div>
                    @if (m.safety?.crisisMode && m.safety?.resources) {
                      <mb-crisis-panel [data]="m.safety!.resources" [compact]="true" />
                    }
                    @if (m.role === 'assistant') {
                      <div class="meta small muted row">
                        <span>{{ m.createdAt | date: 'shortTime' }}</span>
                        @if (feedback()[m.id]) {
                          <span>Thanks for the feedback.</span>
                        } @else {
                          <button type="button" class="link" (click)="rate(m, 'HELPFUL')">
                            Helpful
                          </button>
                          <button type="button" class="link" (click)="rate(m, 'NOT_HELPFUL')">
                            Not helpful
                          </button>
                          <button type="button" class="link" (click)="rate(m, 'REPORTED')">
                            Report
                          </button>
                        }
                      </div>
                    }
                  </div>
                }
                @if (sending()) {
                  <div class="msg"><div class="bubble typing">Thinking…</div></div>
                }
              </div>
              <form class="composer" (ngSubmit)="send()">
                <label for="msg" class="visually-hidden">Message</label>
                <textarea
                  id="msg"
                  class="textarea"
                  name="msg"
                  [(ngModel)]="draft"
                  maxlength="4000"
                  rows="3"
                  placeholder="Write what's on your mind…"
                  (keydown.enter)="onEnter($event)"
                ></textarea>
                <div class="row-between">
                  <span class="small muted">
                    @if (quota()) {
                      {{ quota()!.used }} of {{ quota()!.limit }} messages today
                    }
                  </span>
                  <button class="btn" type="submit" [disabled]="sending() || !draft.trim()">
                    Send
                  </button>
                </div>
              </form>
            }
          </section>
        </div>
      }

      @if (support(); as s) {
        <section class="card support" aria-live="polite">
          <h2>Getting support from a person</h2>
          @if (s.careTeamNotified > 0) {
            <p>
              We let
              {{ s.careTeamNotified === 1 ? s.careTeam[0].displayName : 'your care team' }} know you
              asked for support. They were not shown your conversation. They may not see this
              straight away.
            </p>
          } @else {
            <p>
              You don't have a professional on MindBridge yet.
              <a [routerLink]="s.bookingLink">Find a professional</a>.
            </p>
          }
          <mb-crisis-panel [data]="s.resources" title="If you need to talk to someone now" />
        </section>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .head {
      margin-bottom: var(--mb-space-4);
    }
    .head h1 {
      margin-bottom: 4px;
    }
    .layout {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      gap: var(--mb-space-4);
    }
    @media (max-width: 860px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .conversations {
        max-height: 180px;
        overflow: auto;
      }
    }
    .conv-list {
      list-style: none;
      padding: 0;
      margin: var(--mb-space-3) 0 0;
      display: grid;
      gap: 4px;
    }
    .conv {
      all: unset;
      box-sizing: border-box;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      width: 100%;
      padding: 8px 10px;
      border-radius: var(--mb-radius-sm);
    }
    .conv:hover,
    .conv.active {
      background: var(--mb-primary-soft);
    }
    .conv:focus-visible {
      outline: 3px solid var(--mb-focus);
    }
    .chat {
      display: flex;
      flex-direction: column;
      min-height: 60vh;
      padding: 0;
    }
    .chat-head {
      padding: 10px 16px;
      border-bottom: 1px solid var(--mb-border);
    }
    .chat .alert {
      margin: 12px 16px 0;
    }
    .empty {
      margin: auto;
      text-align: center;
      padding: var(--mb-space-6);
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 60vh;
    }
    .msg {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: flex-start;
      max-width: 85%;
    }
    .msg.user {
      align-self: flex-end;
      align-items: flex-end;
    }
    .bubble {
      background: var(--mb-surface-2);
      padding: 10px 14px;
      border-radius: 16px 16px 16px 4px;
    }
    .user .bubble {
      background: var(--mb-primary);
      color: var(--mb-on-primary);
      border-radius: 16px 16px 4px 16px;
    }
    .notice .bubble {
      background: var(--mb-warning-soft);
    }
    .mock {
      margin-bottom: 6px;
    }
    .pre {
      white-space: pre-wrap;
    }
    .typing {
      font-style: italic;
      color: var(--mb-text-muted);
    }
    .link {
      all: unset;
      cursor: pointer;
      text-decoration: underline;
    }
    .link:focus-visible {
      outline: 2px solid var(--mb-focus);
    }
    .composer {
      border-top: 1px solid var(--mb-border);
      padding: 12px 16px;
      display: grid;
      gap: 8px;
    }
    .composer .textarea {
      min-height: 80px;
    }
    .support {
      margin-top: var(--mb-space-5);
    }
    .consent ul {
      padding-left: 1.2rem;
    }
  `,
})
export class CompanionPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  readonly conversationId = input<string>();
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  protected readonly conversations = signal<Conversation[]>([]);
  protected readonly active = signal<Conversation | null>(null);
  protected readonly messages = signal<AiChatMessage[]>([]);
  protected readonly loadingMessages = signal(false);
  protected readonly sending = signal(false);
  protected readonly busy = signal(false);
  protected readonly consentNeeded = signal(false);
  protected readonly unavailable = signal<string | null>(null);
  protected readonly quota = signal<{ used: number; limit: number } | null>(null);
  protected readonly feedback = signal<Record<string, boolean>>({});
  protected readonly summary = signal<{ summary: string; isMock: boolean } | null>(null);
  protected readonly support = signal<HumanSupport | null>(null);
  protected draft = '';

  constructor() {
    void this.loadConversations();
    effect(() => {
      const id = this.conversationId();
      untracked(() => {
        const c = this.conversations().find((x) => x.id === id);
        if (id && c && this.active()?.id !== id) void this.open(c);
      });
    });
  }

  private handle(err: unknown) {
    const e = ApiError.from(err);
    if (e.code === 'AI_CONSENT_REQUIRED') this.consentNeeded.set(true);
    else if (e.code === 'FEATURE_DISABLED' || e.status === 503) this.unavailable.set(e.message);
    else this.toast.error(e.message);
  }

  async loadConversations() {
    try {
      const consents =
        await this.api.get<{ type: string; granted: boolean; doctorId: string | null }[]>(
          '/consents/me',
        );
      const ai = consents.find((c) => c.type === ConsentType.AI_PROCESSING && !c.doctorId);
      if (!ai?.granted) {
        this.consentNeeded.set(true);
        return;
      }
      const res = await this.api.page<Conversation>('/ai/conversations', { pageSize: 50 });
      this.conversations.set(res.items);
      const wanted = this.conversationId();
      const c = res.items.find((x) => x.id === wanted);
      if (c) void this.open(c);
    } catch (err) {
      this.handle(err);
    }
  }

  select(c: Conversation) {
    void this.router.navigate(['/patient/companion', c.id]);
  }

  async open(c: Conversation) {
    this.active.set(c);
    this.summary.set(null);
    this.loadingMessages.set(true);
    this.messages.set([]);
    try {
      let res = await this.api.page<AiChatMessage>(`/ai/conversations/${c.id}/messages`, {
        pageSize: 100,
      });
      if (res.meta.totalPages > 1) {
        res = await this.api.page<AiChatMessage>(`/ai/conversations/${c.id}/messages`, {
          pageSize: 100,
          page: res.meta.totalPages,
        });
      }
      this.messages.set(res.items);
      this.scrollDown();
    } catch (err) {
      this.handle(err);
    } finally {
      this.loadingMessages.set(false);
    }
  }

  async newConversation() {
    this.busy.set(true);
    try {
      const c = await this.api.post<Conversation>('/ai/conversations', {});
      this.conversations.update((l) => [c, ...l]);
      await this.router.navigate(['/patient/companion', c.id]);
      this.active.set(c);
      this.messages.set([]);
    } catch (err) {
      this.handle(err);
    } finally {
      this.busy.set(false);
    }
  }

  onEnter(ev: Event) {
    const k = ev as KeyboardEvent;
    if (!k.shiftKey) {
      k.preventDefault();
      void this.send();
    }
  }

  async send() {
    const text = this.draft.trim();
    const conv = this.active();
    if (!text || !conv || this.sending()) return;
    this.sending.set(true);
    const temp: AiChatMessage = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    this.messages.update((m) => [...m, temp]);
    this.draft = '';
    this.scrollDown();
    try {
      const res = await this.api.post<SendResult>(`/ai/conversations/${conv.id}/messages`, {
        content: text,
      });
      this.messages.update((m) => [
        ...m.filter((x) => x.id !== temp.id),
        res.userMessage,
        res.reply,
      ]);
      this.quota.set(res.quota);
      this.conversations.update((l) =>
        l.map((x) => (x.id === conv.id ? { ...x, lastMessageAt: res.reply.createdAt } : x)),
      );
    } catch (err) {
      this.messages.update((m) => m.filter((x) => x.id !== temp.id));
      this.draft = text;
      this.handle(err);
    } finally {
      this.sending.set(false);
      this.scrollDown();
    }
  }

  async rate(m: AiChatMessage, value: 'HELPFUL' | 'NOT_HELPFUL' | 'REPORTED') {
    try {
      await this.api.post(`/ai/messages/${m.id}/feedback`, { feedback: value });
      this.feedback.update((f) => ({ ...f, [m.id]: true }));
    } catch (err) {
      this.handle(err);
    }
  }

  async summarize() {
    const conv = this.active();
    if (!conv) return;
    this.busy.set(true);
    try {
      const res = await this.api.post<{ summary: string | null; isMock: boolean }>(
        `/ai/conversations/${conv.id}/summary`,
      );
      if (res.summary) this.summary.set({ summary: res.summary, isMock: res.isMock });
      else this.toast.show('There is nothing to summarise yet.');
    } catch (err) {
      this.handle(err);
    } finally {
      this.busy.set(false);
    }
  }

  async deleteConversation() {
    const conv = this.active();
    if (!conv) return;
    if (
      !(await this.confirm.ask({
        title: 'Delete this conversation?',
        message: 'All messages in it will be permanently deleted.',
        confirmLabel: 'Delete',
        danger: true,
      }))
    )
      return;
    try {
      await this.api.delete(`/ai/conversations/${conv.id}`);
      this.conversations.update((l) => l.filter((x) => x.id !== conv.id));
      this.active.set(null);
      this.messages.set([]);
      await this.router.navigate(['/patient/companion']);
    } catch (err) {
      this.handle(err);
    }
  }

  async humanSupport() {
    try {
      this.support.set(
        await this.api.post<HumanSupport>('/ai/human-support', {
          conversationId: this.active()?.id,
        }),
      );
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async grantConsent() {
    this.busy.set(true);
    try {
      await this.api.post('/consents', { type: ConsentType.AI_PROCESSING, granted: true });
      this.consentNeeded.set(false);
      await this.loadConversations();
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  private scrollDown() {
    setTimeout(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
