import type { ObjectAnalysis } from '@/types/object';
import type { CharacterDecision, GameCharacter } from '@/types/game';
import { generateStats } from './statEngine';
import { getRarity } from './rarity';
import { pickTrait } from '../decision/FallbackDecisionEngine';

/** Pure mapping apart from identity/time; perception and decisions can be reused separately. */
export function createCharacter(analysis: ObjectAnalysis, decision: CharacterDecision, sourceImage: string, aiProvider = 'gemini'): GameCharacter {
  if (analysis.rejected || analysis.confidence < .55) throw new Error('No clear object detected');
  return {
    id: globalThis.crypto.randomUUID(), sourceImage,
    object: { name: analysis.objectName, category: analysis.category, materials: [...analysis.materials], confidence: analysis.confidence },
    identity: { name: analysis.creative.suggestedCharacterName, description: analysis.creative.suggestedDescription, rarity: getRarity(analysis) },
    type: { primary: decision.primaryType, ...(decision.secondaryType && decision.secondaryType !== decision.primaryType ? { secondary: decision.secondaryType } : {}) },
    combat: generateStats(analysis, decision),
    abilities: {
      normalAttack: { name: 'Object impact', description: 'A dependable hit. No cooldown.', power: 1 },
      specialAttack: { name: analysis.creative.suggestedSpecialAbility, description: 'Costs 3 energy. Crushes Strike and Break; a Guard blocks and counters it.', power: 1.8, cooldown: 0 },
      ...(analysis.creative.suggestedPassiveAbility ? { passive: { name: analysis.creative.suggestedPassiveAbility, description: 'Fighter flavor: no additional combat effect.' } } : {}),
    },
    // Laya picks the trait; older decisions without one get the deterministic rule.
    trait: decision.signatureTrait ?? pickTrait(`${analysis.objectName} ${analysis.category} ${analysis.materials.join(' ')}`.toLowerCase(), analysis.properties, decision.combatClass),
    personality: { trashTalk: analysis.creative.trashTalk, ...(analysis.creative.battleLines ? { lines: { ...analysis.creative.battleLines } } : {}) },
    context: analysis.environment ? { environment: analysis.environment } : undefined,
    ...(decision.layaRead ? { layaRead: decision.layaRead } : {}),
    metadata: { createdAt: new Date().toISOString(), aiProvider, decisionProvider: decision.decisionProvider },
  };
}
