import { Injectable, Logger } from '@nestjs/common';
import type { RiskLevel } from '@mindbridge/shared-types';
import { AppConfigService } from '../../config/app-config.service.js';
import type { AiCrisisResource } from '../crisis-resources/crisis-resources.service.js';

export interface AiMeta {
  provider: string;
  model: string;
  prompt_version: string;
  policy_version: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  is_mock: boolean;
  fallback_used: boolean;
  output_guard_actions: string[];
  sources: { title: string; publisher?: string | null; url?: string | null }[];
}

export interface AiSafety {
  risk_level: RiskLevel;
  crisis_mode: boolean;
  signals: string[];
  show_human_support: boolean;
  ask_safety_question: boolean;
  classifier: string;
  classifier_degraded: boolean;
}

export interface SupportReply {
  reply: string;
  safety: AiSafety;
  meta: AiMeta;
}

export interface DoctorAssistReply {
  draft: string;
  label: 'AI_DRAFT_REQUIRES_PROFESSIONAL_REVIEW';
  warnings: string[];
  meta: AiMeta;
}

/** The AI service could not be reached or returned an error. Callers must degrade safely. */
export class AiServiceUnavailableError extends Error {}

/**
 * Thin HTTP client for the internal AI service. The service token is server-side only and
 * requests carry an opaque conversation reference rather than user identifiers.
 */
@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);

  constructor(private readonly config: AppConfigService) {}

  private async post<T>(path: string, body: unknown, timeoutMs = this.config.get('AI_SERVICE_TIMEOUT_MS')): Promise<T> {
    const url = new URL(path, this.config.get('AI_SERVICE_URL')).toString();
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.get('AI_SERVICE_TOKEN')}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      this.logger.warn(`AI service unreachable on ${path}: ${(err as Error).name}`);
      throw new AiServiceUnavailableError('unreachable');
    }
    if (!res.ok) {
      this.logger.warn(`AI service returned ${res.status} on ${path}`);
      throw new AiServiceUnavailableError(`status ${res.status}`);
    }
    return (await res.json()) as T;
  }

  respond(input: {
    sessionRef: string;
    message: string;
    history: { role: 'user' | 'assistant'; content: string }[];
    locale: string;
    country: string;
    crisisResources: AiCrisisResource[];
  }) {
    return this.post<SupportReply>('/v1/support/respond', {
      session_ref: input.sessionRef,
      user_message: input.message,
      history: input.history,
      locale: input.locale.slice(0, 10),
      country: input.country,
      crisis_resources: input.crisisResources.map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined))),
    });
  }

  summarize(sessionRef: string, history: { role: 'user' | 'assistant'; content: string }[], audience: 'patient' | 'professional') {
    return this.post<{ summary: string; meta: AiMeta }>('/v1/support/summarize', { session_ref: sessionRef, history, audience });
  }

  screen(text: string) {
    return this.post<AiSafety>('/v1/safety/screen', { text }, 5000);
  }

  doctorAssist(input: { task: string; professionalCategory: string; instructions?: string; context: Record<string, string> }) {
    return this.post<DoctorAssistReply>('/v1/doctor/assist', {
      task: input.task,
      professional_category: input.professionalCategory,
      instructions: input.instructions,
      context: input.context,
    });
  }

  syncKnowledge(documents: Record<string, unknown>[]) {
    return this.post<{ chunks: number }>('/v1/knowledge/sync', { documents }, 60_000);
  }

  async health(): Promise<{ reachable: boolean; detail?: Record<string, unknown> }> {
    try {
      const res = await fetch(new URL('/v1/health/provider', this.config.get('AI_SERVICE_URL')), {
        headers: { Authorization: `Bearer ${this.config.get('AI_SERVICE_TOKEN')}` },
        signal: AbortSignal.timeout(5000),
      });
      return { reachable: res.ok, detail: res.ok ? ((await res.json()) as Record<string, unknown>) : undefined };
    } catch {
      return { reachable: false };
    }
  }

  async metrics(): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(new URL('/v1/metrics', this.config.get('AI_SERVICE_URL')), {
        headers: { Authorization: `Bearer ${this.config.get('AI_SERVICE_TOKEN')}` },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}
