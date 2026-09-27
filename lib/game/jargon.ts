import type { CombatClass, SignatureTrait } from '@/types/game';

/**
 * Jargon specials: a fixed rule attached to each fighter's Special. The rule is picked HERE,
 * deterministically; Gemini may only rename it. Effects are implemented in Phase 3 (battle engine, opt-in).
 */
export type JargonRuleId = 'TAKE_OFFLINE' | 'CIRCLE_BACK' | 'PER_MY_LAST_EMAIL' | 'ON_MUTE' | 'QUICK_SYNC';
export const JARGON_IDS: JargonRuleId[] = ['TAKE_OFFLINE', 'CIRCLE_BACK', 'PER_MY_LAST_EMAIL', 'ON_MUTE', 'QUICK_SYNC'];
export const JARGON: Record<JargonRuleId, { defaultName: string; rule: string }> = {
  TAKE_OFFLINE: { defaultName: "Let's Take This Offline", rule: 'Bans one of the rival’s moves next round.' },
  CIRCLE_BACK: { defaultName: 'Circle Back', rule: 'Stores the damage it deals and returns it next round.' },
  PER_MY_LAST_EMAIL: { defaultName: 'Per My Last Email', rule: 'Critical hit if the rival repeats its previous move.' },
  ON_MUTE: { defaultName: "You're On Mute", rule: 'Silences the rival’s Special for 1 round.' },
  QUICK_SYNC: { defaultName: 'Quick Sync', rule: '+2 energy, but cannot Guard next round.' },
};

/** Deterministic: derived from the trait (itself derived from physical properties) and class. */
export function pickJargon(trait: SignatureTrait | undefined, combatClass?: CombatClass): JargonRuleId {
  switch (trait) {
    case 'pierce': case 'crush': return 'PER_MY_LAST_EMAIL';
    case 'charged': case 'rush': return 'QUICK_SYNC';
    case 'snare': case 'bulwark': return 'TAKE_OFFLINE';
    case 'flow': case 'cushion': case 'rebound': return 'CIRCLE_BACK';
    case 'scald': case 'shatter': case 'slippery': return 'ON_MUTE';
    default: return combatClass === 'tank' ? 'CIRCLE_BACK' : 'PER_MY_LAST_EMAIL';
  }
}
