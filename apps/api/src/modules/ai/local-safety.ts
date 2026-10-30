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

/**
 * Smart empathetic conversational fallback when the upstream AI model is cold or unreachable.
 * Ensures the companion remains supportive, gentle, and engaging rather than failing with a raw error.
 */
export function smartCompanionFallback(text: string): string {
  const t = text.toLowerCase().trim().replace(/[’‘]/g, "'");

  // Greetings
  if (/^(hi|hello|hey|greetings|howdy|sup)\b/i.test(t)) {
    return (
      "Hello! I'm your MindBridge AI Companion. I'm here to listen, support, and help you navigate how you're feeling in a safe, non-judgmental space. " +
      "How are you doing today?"
    );
  }
  if (/^good\s+morning\b/i.test(t)) {
    return (
      "Good morning! I hope you had a restful night and are having a gentle start to your day. " +
      "I'm here to listen—what's on your mind this morning?"
    );
  }
  if (/^good\s+(afternoon|evening|night)\b/i.test(t)) {
    return (
      "Good evening! I'm here to help you unwind and reflect on your day. " +
      "How has today been treating you?"
    );
  }
  if (/^(how are you|how'?re you|who are you|what can you do)\b/i.test(t)) {
    return (
      "I'm doing well, thank you for asking! I'm your MindBridge mental wellness companion. " +
      "You can chat with me about anything on your mind—stress, sleep, relationships, or just how your day went. What would feel most helpful to talk about right now?"
    );
  }

  // Feelings: Anxiety / Panic / Overthinking
  if (/\b(anxious|anxiety|worried|worry|panic|nervous|overthinking|racing thoughts)\b/i.test(t)) {
    return (
      "It sounds like you're experiencing anxiety right now, and that can feel really overwhelming. " +
      "Take a slow breath with me: breathe in gently for 4 counts, hold for 4, and slowly release for 6. " +
      "You are in a safe space. Would it help to tell me what's triggering this worry?"
    );
  }

  // Feelings: Stress / Overwhelm / Pressure / Burnout
  if (/\b(stress|stressed|pressure|exam|deadline|work|burnout|overwhelmed|too much)\b/i.test(t)) {
    return (
      "It sounds like you're carrying a heavy burden right now. When everything piles up, it's completely natural to feel overwhelmed. " +
      "Would it help to break down what's in front of you into just one small next step?"
    );
  }

  // Feelings: Low mood / Sadness / Depression
  if (/\b(sad|down|low|depressed|depression|empty|crying|cry|unhappy|miserable)\b/i.test(t)) {
    return (
      "I hear how heavy things feel for you right now, and I'm really glad you reached out. You don't have to carry this all alone. " +
      "When you've felt like this in the past, has there been any small comfort that offered even a little relief?"
    );
  }

  // Feelings: Sleep / Insomnia / Exhaustion
  if (/\b(sleep|insomnia|tired|exhausted|can't sleep|cannot sleep|nightmare)\b/i.test(t)) {
    return (
      "Struggling with sleep can make every other challenge feel twice as hard. " +
      "A quiet wind-down routine—dimming lights and stepping away from active screens—can sometimes help settle a racing mind. " +
      "How has your sleep schedule been lately?"
    );
  }

  // Feelings: Loneliness / Isolation
  if (/\b(lonely|alone|isolated|nobody|no one cares|abandoned)\b/i.test(t)) {
    return (
      "Feeling lonely or disconnected is deeply painful, but please know you are not alone right now. I'm right here with you. " +
      "Would it help to think of someone you feel safe with that you could send a simple hello to today?"
    );
  }

  // Positive emotions / Gratitude / Improvements
  if (/\b(thank you|thanks|grateful|better|good|happy|fine)\b/i.test(t)) {
    return (
      "You're very welcome! I'm glad we could connect. Remember that taking time to check in with yourself is a meaningful act of self-care. " +
      "Is there anything else you'd like to share or explore today?"
    );
  }

  // Fallback for unclassified queries (preserves test expectation for 'rough day')
  return UNAVAILABLE_TEMPLATE;
}
