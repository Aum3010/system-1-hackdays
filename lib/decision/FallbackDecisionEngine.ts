import type { ObjectAnalysis, TraitLevel } from '@/types/object';
import type { CharacterDecision, CombatClass, ElementType, SignatureTrait } from '@/types/game';
import type { DecisionEngine } from './DecisionEngine';

const levels: TraitLevel[] = ['very_low', 'low', 'medium', 'high', 'very_high'];
const rank = (level: TraitLevel) => levels.indexOf(level);
const tier = (score: number): TraitLevel => levels[Math.max(0, Math.min(4, Math.round(score)))];

export class FallbackDecisionEngine implements DecisionEngine {
  async classify(analysis: ObjectAnalysis): Promise<CharacterDecision> {
    const text = `${analysis.objectName} ${analysis.category} ${analysis.materials.join(' ')}`.toLowerCase();
    const p = analysis.properties;
    const metal = /metal|steel|alumin|iron|copper|brass/.test(text);
    let primaryType: ElementType = 'chaos';
    if (/heater|toaster|oven|stove|candle|kettle|coffee|mug|fire extinguisher/.test(text)) primaryType = 'heat';
    else if (p.electronic) primaryType = 'electric';
    else if (/bottle|water|liquid|umbrella|cup/.test(text)) primaryType = 'water';
    else if (/plant|wood|leaf|flower|fruit|banana|paper/.test(text)) primaryType = 'nature';
    else if (metal) primaryType = 'metal';

    let combatClass: CombatClass = 'balanced';
    if (rank(p.fragility) >= 3 && (p.electronic || rank(p.sharpness) >= 3)) combatClass = 'glass_cannon';
    else if (rank(p.durability) >= 3 && rank(p.mobility) <= 2) combatClass = 'tank';
    else if (rank(p.mobility) >= 3 && rank(p.weight) <= 2) combatClass = 'speedster';
    else if (rank(p.sharpness) >= 3 || /stapler|hammer|scissor|mechanical/.test(text)) combatClass = 'fighter';
    else if (/plant|flower|backpack/.test(text)) combatClass = 'support';
    else if (rank(p.weight) <= 1 && (primaryType === 'chaos' || rank(p.flexibility) >= 3)) combatClass = 'trickster';

    return {
      combatClass, primaryType, signatureTrait: pickTrait(text, p, combatClass),
      ...(metal && primaryType !== 'metal' ? { secondaryType: 'metal' as const } : {}),
      attackTier: tier(2 + (rank(p.sharpness) - 2) * 0.6),
      defenseTier: tier(rank(p.durability) + (metal ? 1 : 0) - Math.max(0, rank(p.fragility) - 2)),
      healthTier: tier(2 + (rank(p.weight) - 2) * 0.7),
      speedTier: tier(rank(p.mobility) - Math.max(0, rank(p.weight) - 2) + (p.electronic ? 1 : 0)),
      decisionProvider: 'fallback',
    };
  }
}

/** Deterministic trait choice: explicit object keywords first, then physical properties, then class. */
export function pickTrait(text: string, p: ObjectAnalysis['properties'], combatClass: CombatClass): SignatureTrait {
  if (/coffee|tea|kettle|lamp|candle|toaster|heater|iron|stove|hair ?dryer/.test(text)) return 'scald';
  if (/bottle|mug|cup|jar|glass of|flask|thermos|water|liquid/.test(text)) return 'flow';
  if (/tape|rubber band|glue|elastic|cable|cord|string|velcro/.test(text)) return 'snare';
  if (/pillow|plush|cushion|towel|sponge|blanket|teddy|sock/.test(text)) return 'cushion';
  if (/ball|spring|eraser|sneaker|shoe/.test(text)) return 'rebound';
  if (/wheel|skateboard|car|drone|scooter|roller/.test(text)) return 'rush';
  if (p.electronic) return 'charged';
  if (rank(p.sharpness) >= 3 || /scissor|knife|pen|pencil|fork|staple|needle/.test(text)) return 'pierce';
  if (rank(p.fragility) >= 3) return 'shatter';
  if (rank(p.weight) >= 3) return 'crush';
  if (rank(p.durability) >= 3) return 'bulwark';
  if (rank(p.weight) <= 1) return 'slippery';
  return combatClass === 'speedster' ? 'rush' : combatClass === 'tank' || combatClass === 'support' ? 'bulwark' : 'pierce';
}
