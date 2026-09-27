import type { ObjectAnalysis } from '@/types/object';
import type { CharacterDecision } from '@/types/game';
import type { DecisionEngine } from './DecisionEngine';
import { LayaProfileEngine } from './LayaProfileEngine';
import { FallbackDecisionEngine } from './FallbackDecisionEngine';

export class DecisionEngineService implements DecisionEngine {
  constructor(private primary: DecisionEngine = new LayaProfileEngine(), private fallback: DecisionEngine = new FallbackDecisionEngine()) {}
  async classify(analysis: ObjectAnalysis): Promise<CharacterDecision> {
    try {
      const decision = await this.primary.classify(analysis);
      console.info('[decision] decisionProvider=laya');
      return decision;
    } catch (error) {
      // Do not print request state, credentials or endpoint URLs.
      console.info('[decision] decisionProvider=fallback', error instanceof Error && error.message === 'Laya timed out' ? '(timeout)' : '(unavailable or invalid)');
      return this.fallback.classify(analysis);
    }
  }
}
export function classifyCharacter(analysis: ObjectAnalysis): Promise<CharacterDecision> {
  return new DecisionEngineService().classify(analysis);
}
