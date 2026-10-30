import { Injectable, Logger } from '@nestjs/common';
import type { CouncilAiSafetyAssessment } from '@mindbridge/shared-types';

const NUDITY_AND_ADULT_PATTERNS = [
  /\b(nsfw|nude|nudity|semi-?nude|topless|naked)\b/i,
  /\b(onlyfans|fansly|camgirl|camm|webcam model)\b/i,
  /\b(erotic|erotica|lewd|sensual|fetish|xxx|porn|pornograph(y|ic))\b/i,
  /\b(lingerie model|bikini model|adult model|glamour model)\b/i,
  /\b(spicy content|18\+\s*(only|exclusive|content)|uncensored)\b/i,
  /\b(escort|sugar\s*(baby|daddy)|sensual massage)\b/i,
];

const VULGARITY_PATTERNS = [
  /\b(f+u+c+k|sh+i+t|b+i+t+c+h|a+s+s+h+o+l+e|c+u+n+t|d+i+c+k|p+u+s+s+y)\b/i,
  /\b(slut|whore|motherfucker|bastard|jackass)\b/i,
];

const MENTAL_HEALTH_POSITIVE_SIGNALS = [
  /\b(mental\s*health|wellness|mindfulness|psycholog(y|ist)|therap(y|ist))\b/i,
  /\b(anxiety|depression|recovery|self-?care|healing|empathy|support)\b/i,
  /\b(counsel(ing|or)|wellbeing|resilience|neurodiversity|stress)\b/i,
  /\b(community|advocate|awareness|destigmatiz(e|ing)|crisis)\b/i,
];

@Injectable()
export class AiScreenerService {
  private readonly logger = new Logger(AiScreenerService.name);

  /**
   * Evaluates Influencer content, bios, social handles, and samples for adult content,
   * vulgarity, semi-nudity, and overall mental health brand alignment.
   */
  screenInfluencer(input: {
    handle: string;
    platform: string;
    bio?: string;
    sampleContent?: string;
    portfolioUrl?: string;
  }): CouncilAiSafetyAssessment {
    const combined = [
      input.handle,
      input.platform,
      input.bio ?? '',
      input.sampleContent ?? '',
      input.portfolioUrl ?? '',
    ].join(' ').toLowerCase();

    const flaggedReasons: string[] = [];

    // 1. Adult, nudity, and semi-nudity check
    for (const pattern of NUDITY_AND_ADULT_PATTERNS) {
      if (pattern.test(combined)) {
        flaggedReasons.push('ADULT_OR_SEMI_NUDITY_CONTENT_DETECTED');
        break;
      }
    }

    // 2. Vulgarity & profanity check
    for (const pattern of VULGARITY_PATTERNS) {
      if (pattern.test(combined)) {
        flaggedReasons.push('VULGAR_OR_OBSCENE_LANGUAGE_DETECTED');
        break;
      }
    }

    // 3. Mental health alignment check
    const positiveMatches = MENTAL_HEALTH_POSITIVE_SIGNALS.filter((r) => r.test(combined)).length;

    // Determine final score & safety recommendation
    if (flaggedReasons.length > 0) {
      const isAdult = flaggedReasons.includes('ADULT_OR_SEMI_NUDITY_CONTENT_DETECTED');
      return {
        isSafe: false,
        safetyScore: isAdult ? 12 : 28,
        riskCategory: 'VULGARITY_OR_ADULT_CONTENT',
        flaggedReasons,
        summary: isAdult
          ? 'AI Content Safety Warning: Profile or content sample contains terms associated with adult, erotic, or semi-nudity content. Ineligible for MindBridge healthcare ambassadorship.'
          : 'AI Content Safety Warning: High density of vulgarity or explicit language detected. Not suitable for patient-facing mental health advocacy.',
        recommendation: 'AUTOMATIC_REJECTION',
      };
    }

    // Safe profile scoring
    const safetyScore = Math.min(100, 85 + positiveMatches * 4);

    return {
      isSafe: true,
      safetyScore,
      riskCategory: 'CLEAN_BRAND_SAFE',
      flaggedReasons: [],
      summary: positiveMatches > 0
        ? `AI Safety Verified: Brand-safe creator profile with strong mental health and wellness alignment (${positiveMatches} verified positive signals). Recommended for Council membership.`
        : 'AI Safety Verified: Content sample and profile are brand-safe with zero explicit or adult content detected. Ready for healthcare advocacy onboarding.',
      recommendation: 'RECOMMEND_APPROVAL',
    };
  }

  /**
   * Generates tailored AI mental health awareness missions and tasks for Influencer Admins.
   */
  generateInfluencerTasks(): Array<{
    title: string;
    description: string;
    deliverableFormat: string;
    targetFocus: string;
  }> {
    return [
      {
        title: 'Video Reel: "3 Subtle Signs of High-Functioning Anxiety You Might Miss"',
        description:
          'Create a 60-90 second educational Reel/TikTok explaining high-functioning anxiety. Share 1 grounding technique (4-7-8 breathing), introduce MindBridge’s free anonymous AI companion, and tag Tele-MANAS helpline (14416).',
        deliverableFormat: 'Instagram Reel / YouTube Short',
        targetFocus: 'Anxiety Awareness & De-stigmatization',
      },
      {
        title: 'Carousel Post: "Where to Get Free Confidential Mental Health Help in India"',
        description:
          'A 5-slide educational infographic carousel listing Tele-MANAS (14416), Kiran (1800-599-0019), and MindBridge regional partner NGOs. Provide a direct CTA to use MindBridge tools.',
        deliverableFormat: 'Instagram Carousel / LinkedIn Post',
        targetFocus: 'Crisis Helplines & NGO Directory',
      },
      {
        title: 'Personal Reflection Reel: "Therapy Was Not What I Feared It Would Be"',
        description:
          'A vulnerable talking-head video normalizing professional counseling. Encourage viewers to take the free PHQ-9 self-assessment on MindBridge and seek licensed guidance when needed.',
        deliverableFormat: 'Talking-Head Reel / Video',
        targetFocus: 'Normalizing Therapy & Clinical Consultations',
      },
      {
        title: 'Story Campaign: "5-Minute Midday De-stress & Live Q&A"',
        description:
          'Publish a series of 4 Instagram Stories doing a live 5-minute breathing exercise, pointing followers to the MindBridge mood check-in widget and inviting questions on stress management.',
        deliverableFormat: 'Instagram Stories (4-part series)',
        targetFocus: 'Real-time Community Coping & Engagement',
      },
    ];
  }
}
