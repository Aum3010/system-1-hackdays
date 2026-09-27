import type { ObjectAnalysis, TraitLevel } from '@/types/object';
import type { CharacterDecision, CombatClass } from '@/types/game';

type Range = readonly [number, number];
type Profile = { hp: Range; attack: Range; defense: Range; speed: Range };
export const CLASS_PROFILES: Record<CombatClass, Profile> = {
  tank: { hp: [85,100], attack: [45,65], defense: [80,100], speed: [20,45] },
  fighter: { hp: [65,85], attack: [75,95], defense: [55,75], speed: [45,70] },
  speedster: { hp: [45,70], attack: [60,80], defense: [35,60], speed: [80,100] },
  trickster: { hp: [55,75], attack: [55,75], defense: [45,65], speed: [65,90] },
  glass_cannon: { hp: [40,65], attack: [85,100], defense: [25,50], speed: [60,85] },
  balanced: { hp: [60,80], attack: [60,80], defense: [60,80], speed: [60,80] },
  support: { hp: [70,90], attack: [45,65], defense: [65,85], speed: [50,75] },
};
const tierWeight: Record<TraitLevel, number> = { very_low: 0, low: .25, medium: .5, high: .75, very_high: 1 };
const within = ([min,max]: Range, tier: TraitLevel) => min + (max-min) * tierWeight[tier];
export const clampStat = (n: number) => Math.min(100, Math.max(20, Math.round(n)));

export function generateStats(analysis: ObjectAnalysis, decision: CharacterDecision) {
  const profile = CLASS_PROFILES[decision.combatClass];
  const p = analysis.properties;
  const metal = /metal|steel|alumin|iron|brass/.test(analysis.materials.join(' ').toLowerCase());
  const heavy = tierWeight[p.weight] >= .75;
  const sharp = tierWeight[p.sharpness] >= .75;
  const fragile = tierWeight[p.fragility] >= .75;
  // Laya's bounded second opinion (0 when the fallback decided): see LayaProfileEngine.
  const nudge = decision.layaRead?.statNudge ?? { attack: 0, defense: 0, health: 0, speed: 0 };
  const hp = clampStat(within(profile.hp, decision.healthTier) + (heavy ? 8 : 0) + nudge.health);
  return {
    class: decision.combatClass, hp, maxHp: hp,
    attack: clampStat(within(profile.attack, decision.attackTier) + (sharp ? 8 : 0) + nudge.attack),
    defense: clampStat(within(profile.defense, decision.defenseTier) + (metal ? 8 : 0) - (fragile ? 8 : 0) + nudge.defense),
    speed: clampStat(within(profile.speed, decision.speedTier) - (heavy ? 5 : 0) + (p.electronic ? 5 : 0) + nudge.speed),
  };
}
