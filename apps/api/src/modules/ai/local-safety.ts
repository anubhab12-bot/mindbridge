import { RiskLevel } from '@mindbridge/shared-types';

/**
 * Last-resort safety layer used ONLY when the AI service is unreachable. It is intentionally
 * conservative (it prefers false positives) and much simpler than the AI service's rules
 * engine. Its job is to make sure a person in crisis still sees crisis resources while the
 * AI service is down. Templates mirror apps/ai-service/app/prompts/templates.py and never
 * contain phone numbers: the client renders verified contacts from the crisis registry.
 */
export const LOCAL_RULES_VERSION = 'api-local-2026.10.27';

const IMMINENT = [
  /\b(going to|gonna|about to|will)\s+(kill myself|end (it|my life)|take my (own )?life)\s+(now|tonight|today)\b/,
  /\b(just|already)\s+(took|swallowed|overdosed)\b/,
  /\b(standing|sitting)\s+(on|at)\s+(the\s+)?(bridge|ledge|roof|edge|tracks)\b/,
  /\b(final|last)\s+goodbye\b/,
];
const HIGH = [
  /\b(kill|hurt|harm|cut|burn)\s+myself\b/,
  /\bsuicid(e|al)\b/,
  /\b(end|take)\s+my\s+(own\s+)?life\b/,
  /\bkms\b/,
  /\b(don'?t|do not)\s+want\s+to\s+(live|be alive|wake up|exist)\b/,
  /\bbetter\s+off\s+(dead|without me)\b/,
  /\b(want|wish)\s+(to|i could)\s+die\b/,
  /\boverdose\b/,
];
const ELEVATED = [/\bhopeless\b/, /\bcan'?t\s+(take|do)\s+(this|it)\s+anymore\b/, /\bdisappear\b/, /\b(hits|beats|abuses)\s+me\b/];

export interface LocalScreen {
  riskLevel: RiskLevel;
  signals: string[];
}

export function localScreen(text: string): LocalScreen {
  const t = text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
  if (IMMINENT.some((r) => r.test(t))) return { riskLevel: RiskLevel.IMMINENT, signals: ['local_imminent_pattern'] };
  if (HIGH.some((r) => r.test(t))) return { riskLevel: RiskLevel.HIGH, signals: ['local_high_pattern'] };
  if (ELEVATED.some((r) => r.test(t))) return { riskLevel: RiskLevel.ELEVATED, signals: ['local_elevated_pattern'] };
  return { riskLevel: RiskLevel.NONE, signals: [] };
}

const RANK: Record<RiskLevel, number> = { NONE: 0, LOW: 1, ELEVATED: 2, HIGH: 3, IMMINENT: 4 };
export const riskRank = (r: RiskLevel) => RANK[r];
export const maxRisk = (a: RiskLevel, b: RiskLevel) => (RANK[a] >= RANK[b] ? a : b);

function resourcesLine(hasResources: boolean) {
  return hasResources
    ? 'The verified crisis contacts shown on your screen are free to call and available to help right now.'
    : "I don't have a verified local crisis line for your location, so please call your local emergency number or go to the nearest hospital emergency department.";
}

export function crisisTemplate(level: RiskLevel, hasResources: boolean): string {
  if (level === RiskLevel.IMMINENT) {
    return (
      "I'm really glad you told me, and I'm taking what you said seriously. Your safety matters most right now. " +
      'Please call your local emergency number now (it is shown on your screen if we have it) or go to the nearest emergency department. ' +
      'If you can, move away from anything you could use to hurt yourself and go to where another person is. ' +
      `${resourcesLine(hasResources)} I'm an AI and I can't contact anyone for you. Are you somewhere safe right now?`
    );
  }
  return (
    "Thank you for trusting me with something this painful. You don't have to carry it alone. " +
    'I want to ask you directly, because it matters: are you safe right now? ' +
    `${resourcesLine(hasResources)} Talking to a trained person can really help, and you can also reach out to someone you trust. ` +
    "I'm an AI, not a counsellor."
  );
}

export const UNAVAILABLE_TEMPLATE =
  "I'm sorry, I'm having trouble responding right now. I still want to hear what's on your mind. " +
  'You could try again in a moment, write in your journal, or reach out to someone you trust. ' +
  "If you're feeling unsafe at any point, please use the crisis support options in the app.";

export const QUOTA_TEMPLATE =
  "You've reached today's limit for AI companion messages. It resets tomorrow. " +
  'In the meantime you can use your journal or breathing exercises, or reach out to someone you trust. ' +
  "If you're feeling unsafe, please use the crisis support options in the app.";
