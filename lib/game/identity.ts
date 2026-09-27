import type { ObjectAnalysis } from '@/types/object';
import type { SignatureTrait } from '@/types/game';
import { FallbackDecisionEngine, pickTrait } from '../decision/FallbackDecisionEngine';
import { pickJargon, type JargonRuleId } from './jargon';

/**
 * The fixed rules attached to an object, derived ONLY from its analysis so that parallel
 * calls (/api/character and /api/lore) always agree. Never chosen by Gemini.
 */
export async function identityRules(analysis: ObjectAnalysis): Promise<{ trait: SignatureTrait; jargon: JargonRuleId }> {
  const baseline = await new FallbackDecisionEngine().classify(analysis);
  const trait = baseline.signatureTrait ?? pickTrait(`${analysis.objectName} ${analysis.category} ${analysis.materials.join(' ')}`.toLowerCase(), analysis.properties, baseline.combatClass);
  return { trait, jargon: pickJargon(trait, baseline.combatClass) };
}
