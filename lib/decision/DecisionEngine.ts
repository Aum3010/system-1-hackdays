import type { ObjectAnalysis } from '@/types/object';
import type { CharacterDecision } from '@/types/game';

/** Reusable decision layer: no image, UI or battle dependencies. */
export interface DecisionEngine {
  classify(analysis: ObjectAnalysis): Promise<CharacterDecision>;
}
