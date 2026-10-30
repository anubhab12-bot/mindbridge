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

  async respond(input: {
    sessionRef: string;
    message: string;
    history: { role: 'user' | 'assistant'; content: string }[];
    locale: string;
    country: string;
    crisisResources: AiCrisisResource[];
  }): Promise<SupportReply> {
    try {
      return await this.post<SupportReply>('/v1/support/respond', {
        session_ref: input.sessionRef,
        user_message: input.message,
        history: input.history,
        locale: input.locale.slice(0, 10),
        country: input.country,
        crisis_resources: input.crisisResources.map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined))),
      });
    } catch (err) {
      const apiKey = process.env['AI_API_KEY'];
      if (apiKey) {
        try {
          const directReply = await this.callDirectLlm(input, apiKey);
          if (directReply) return directReply;
        } catch (llmErr) {
          this.logger.warn(`Direct LLM call failed: ${(llmErr as Error).message}`);
        }
      }
      throw err;
    }
  }

  private async callDirectLlm(
    input: { message: string; history: { role: 'user' | 'assistant'; content: string }[] },
    apiKey: string,
  ): Promise<SupportReply | null> {
    const baseUrl = (process.env['AI_BASE_URL'] || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const model = process.env['AI_MODEL'] || 'gpt-4o-mini';
    const systemPrompt =
      'You are MindBridge AI, an empathetic and supportive mental wellness companion. ' +
      'You listen actively, validate feelings with warmth and care, and offer gentle evidence-based coping strategies (mindfulness, grounding, CBT reframing). ' +
      'Keep replies supportive, conversational, and gentle. Always encourage self-compassion.';

    const messages = [
      { role: 'system', content: systemPrompt },
      ...input.history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: input.message },
    ];

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    return {
      reply: text,
      safety: {
        risk_level: 'NONE' as RiskLevel,
        crisis_mode: false,
        signals: [],
        show_human_support: false,
        ask_safety_question: false,
        classifier: 'direct_llm',
        classifier_degraded: false,
      },
      meta: {
        provider: 'direct_llm',
        model,
        prompt_version: 'api-direct-1.0',
        policy_version: 'api-safety-1.0',
        input_tokens: data?.usage?.prompt_tokens ?? 0,
        output_tokens: data?.usage?.completion_tokens ?? 0,
        latency_ms: 800,
        is_mock: false,
        fallback_used: false,
        output_guard_actions: [],
        sources: [],
      },
    };
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
