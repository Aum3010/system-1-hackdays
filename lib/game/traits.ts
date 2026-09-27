import type { SignatureTrait } from '@/types/game';

/**
 * Signature Traits: each fighter bends exactly ONE combat rule. Laya (or the fallback)
 * picks the trait from physical properties; the numeric effect lives in battleEngine.ts.
 */
export const TRAITS: Record<SignatureTrait, { name: string; source: string; rule: string }> = {
  pierce: { name: 'Pierce', source: 'Sharp', rule: 'Strikes chip through a Guard (0.3× instead of 0).' },
  crush: { name: 'Crush', source: 'Heavy', rule: 'Breaking a Guard drains 2 energy instead of 1.' },
  charged: { name: 'Charged', source: 'Electronic', rule: 'Starts the match with 2 energy.' },
  cushion: { name: 'Cushion', source: 'Soft', rule: 'Takes only 0.75× damage from Break.' },
  flow: { name: 'Flow', source: 'Liquid', rule: 'Guard vs Guard gives +2 bonus energy instead of +1.' },
  shatter: { name: 'Shatter', source: 'Fragile', rule: 'Special costs 2 energy, but takes +10% damage.' },
  snare: { name: 'Snare', source: 'Sticky or elastic', rule: 'A successful Guard counter steals the speed tiebreak next round.' },
  scald: { name: 'Scald', source: 'Hot', rule: 'Guard counters burn for 4 damage per round for 2 rounds.' },
  rebound: { name: 'Rebound', source: 'Springy', rule: 'When its Guard is broken, bounces back 0.4× damage.' },
  rush: { name: 'Rush', source: 'Fast-moving', rule: 'Wins same-move clashes by +25% instead of +10%.' },
  bulwark: { name: 'Bulwark', source: 'Sturdy', rule: 'Guard counters Strike for 0.8× instead of 0.6×.' },
  slippery: { name: 'Slippery', source: 'Small or smooth', rule: 'Specials hit it for 1.4× instead of 1.8×.' },
};
export const TRAIT_IDS = Object.keys(TRAITS) as SignatureTrait[];
