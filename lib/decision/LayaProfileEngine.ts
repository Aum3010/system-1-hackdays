import type { ObjectAnalysis } from '@/types/object';
import type { CharacterDecision, ElementType, LayaRead, StatKey } from '@/types/game';
import type { DecisionEngine } from './DecisionEngine';
import { FallbackDecisionEngine } from './FallbackDecisionEngine';
import { askLaya, layaTimeoutMs, readChoice, readScore, type LayaQuestion } from './layaClient';
import { CharacterDecisionSchema } from '@/lib/validation/schemas';

const ELEMENTS: ElementType[] = ['heat', 'water', 'electric', 'nature', 'metal', 'chaos'];
const STATS: StatKey[] = ['attack', 'defense', 'health', 'speed'];
/** Minimum calibrated confidence before Laya's element replaces the rule-based one. */
export const ELEMENT_MIN_CONFIDENCE = .6;
/** Laya's 0-4 ratings cluster around ~1.9 for everyday objects; each point away is worth this many stat points. */
const NUDGE_CENTER = 1.9, NUDGE_PER_POINT = 6, NUDGE_MAX = 8;

/**
 * Questions tuned against a live laya-serve (Sept 26): a one-shot `combatClass` choice returned
 * "balanced" for nearly every object, so class stays with the physical-property rules. Laya's
 * element pick is reliable when confident, and its 0-4 ratings order objects sensibly
 * (rubber ball lowest attack, cast-iron pan highest defense) as a bounded nudge.
 */
export const LAYA_PROFILE_QUESTIONS: Record<string, LayaQuestion> = {
  primaryType: { type: 'choice', instructions: 'Which element best matches what `object` is used for?', criteria: {
    heat: 'it is hot or makes heat: coffee, kettle, lamp, toaster, pan on a stove',
    water: 'it holds or uses water or liquid: bottle, cup, vase, umbrella',
    electric: 'it runs on electricity or batteries: laptop, phone, charger',
    nature: 'it is made of plants, wood, cloth or food: pillow, plant, paper, fruit',
    metal: 'it is mainly a metal tool: scissors, stapler, wrench',
    chaos: 'none of these: toys, rubber, odd objects',
  } },
  attack: { type: 'score', instructions: 'How dangerous would `object` be if swung or thrown? Consider sharpness, hardness and weight.', criteria: ['harmless: soft or tiny', 'mild: could sting a little', 'moderate: blunt and firm', 'strong: hard, heavy or pointed', 'severe: sharp blade or very heavy'] },
  defense: { type: 'score', instructions: 'How well does `object` survive being hit or dropped?', criteria: ['breaks instantly', 'fragile', 'average', 'tough', 'nearly indestructible'] },
  health: { type: 'score', instructions: 'How much bulk and mass does `object` have?', criteria: ['tiny and weightless', 'small and light', 'medium hand-held', 'large or heavy', 'very large and heavy'] },
  speed: { type: 'score', instructions: 'How quick and nimble is `object` to move or throw?', criteria: ['immovable', 'slow and awkward', 'average', 'light and quick', 'extremely light or has wheels'] },
};

export const layaObjectState = (analysis: ObjectAnalysis) => ({ object: `a ${analysis.objectName} (${analysis.category}) made of ${analysis.materials.join(', ')}` });
export const statNudge = (score: number) => Math.round(Math.max(-NUDGE_MAX, Math.min(NUDGE_MAX, (score - NUDGE_CENTER) * NUDGE_PER_POINT)));

/**
 * Default Laya engine: the rule-based profile is the baseline, and Laya contributes where it
 * measured well. Class, tiers and trait stay deterministic, so parallel routes always agree.
 */
export class LayaProfileEngine implements DecisionEngine {
  constructor(private endpoint = process.env.LAYA_ENDPOINT, private token?: string, private timeoutMs = layaTimeoutMs()) {}

  async classify(analysis: ObjectAnalysis): Promise<CharacterDecision> {
    const [baseline, answers] = await Promise.all([
      new FallbackDecisionEngine().classify(analysis),
      askLaya(layaObjectState(analysis), LAYA_PROFILE_QUESTIONS, { endpoint: this.endpoint, timeoutMs: this.timeoutMs, ...(this.token !== undefined ? { token: this.token } : {}) }),
    ]);
    const element = readChoice(answers.primaryType, ELEMENTS);
    const scores = STATS.map(key => readScore(answers[key]));
    if (!element || scores.some(s => !s)) throw new Error('Invalid Laya response');
    // Strong physical signals win: Gemini's "electronic" flag and the hot-object keywords.
    const locked = analysis.properties.electronic || baseline.primaryType === 'heat';
    const used = !locked && element.confidence >= ELEMENT_MIN_CONFIDENCE;
    const layaRead: LayaRead = {
      primaryType: { choice: element.choice, confidence: Math.round(element.confidence * 100) / 100, used },
      statNudge: Object.fromEntries(STATS.map((key, i) => [key, statNudge(scores[i]!.score)])) as Record<StatKey, number>,
    };
    const primaryType = used ? element.choice : baseline.primaryType;
    const { secondaryType, ...rest } = baseline;
    return CharacterDecisionSchema.parse({
      ...rest,
      ...(secondaryType && secondaryType !== primaryType ? { secondaryType } : {}),
      primaryType, decisionProvider: 'laya', layaRead,
    });
  }
}
