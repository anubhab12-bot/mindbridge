import { RiskLevel } from '@mindbridge/shared-types';
import { describe, expect, it } from 'vitest';
import { crisisTemplate, localScreen, maxRisk, QUOTA_TEMPLATE, smartCompanionFallback, UNAVAILABLE_TEMPLATE } from './local-safety.js';

describe('local fallback screen', () => {
  it.each([
    ["I'm going to kill myself tonight", RiskLevel.IMMINENT],
    ['I just took all my pills', RiskLevel.IMMINENT],
    ['I want to kill myself', RiskLevel.HIGH],
    ["I don't want to live anymore", RiskLevel.HIGH],
    ['I feel suicidal', RiskLevel.HIGH],
    ['I feel hopeless', RiskLevel.ELEVATED],
    ['I had a long day at work', RiskLevel.NONE],
  ])('%s -> %s', (text, level) => {
    expect(localScreen(text).riskLevel).toBe(level);
  });

  it('only ever raises when combined', () => {
    expect(maxRisk(RiskLevel.NONE, RiskLevel.HIGH)).toBe(RiskLevel.HIGH);
    expect(maxRisk(RiskLevel.IMMINENT, RiskLevel.LOW)).toBe(RiskLevel.IMMINENT);
  });

  it('templates never contain phone numbers', () => {
    for (const t of [
      crisisTemplate(RiskLevel.IMMINENT, true),
      crisisTemplate(RiskLevel.HIGH, false),
      UNAVAILABLE_TEMPLATE,
      QUOTA_TEMPLATE,
    ]) {
      expect(t).not.toMatch(/\d{3,}/);
    }
  });

  it('never claims to contact anyone', () => {
    expect(crisisTemplate(RiskLevel.IMMINENT, true)).toContain("can't contact anyone for you");
  });
});

describe('smartCompanionFallback', () => {
  it('responds warmly to greetings', () => {
    expect(smartCompanionFallback('Hi')).toContain('MindBridge AI Companion');
    expect(smartCompanionFallback('Good morning')).toContain('Good morning');
    expect(smartCompanionFallback('Good evening')).toContain('Good evening');
  });

  it('provides supportive advice for emotional themes', () => {
    expect(smartCompanionFallback('I feel so anxious and panicked')).toContain('slow breath');
    expect(smartCompanionFallback('I am feeling very stressed and burnt out')).toContain('small next step');
    expect(smartCompanionFallback('I feel lonely and isolated')).toContain('not alone');
    expect(smartCompanionFallback('I cannot sleep')).toContain('wind-down');
  });

  it('falls back to UNAVAILABLE_TEMPLATE for unhandled phrases like rough day', () => {
    expect(smartCompanionFallback('rough day')).toBe(UNAVAILABLE_TEMPLATE);
  });
});
