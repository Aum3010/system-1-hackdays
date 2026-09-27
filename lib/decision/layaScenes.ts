import { ARENA_IDS, REINFORCEMENT_IDS, REINFORCEMENTS, type ArenaId, type ReinforcementItem } from '../game/arenas';
import { askLaya, layaConfigured, readChoice, type LayaQuestion } from './layaClient';

/**
 * Laya as the referee for categorical game effects: Gemini only describes the photo
 * (object name / scene), Laya picks the category, and the engine applies the fixed effect.
 * Live check (Sept 26): 8/8 sensible items (book -> shield .92, duct tape -> trap .88) and
 * 6/6 arenas, ~0.7 s each on CPU. Laya's calibrated confidence for a clear winner among 4-6
 * options sits around .45 (laptop -> energy .45, runner-up .25), hence the .4 bar. Below it,
 * Gemini's own pick is kept.
 */
export const SCENE_MIN_CONFIDENCE = .4;
/** Short budget: these run between rounds or on the VS screen. */
export const SCENE_LAYA_TIMEOUT_MS = 4000;

export const REINFORCEMENT_QUESTION: Record<string, LayaQuestion> = {
  item: { type: 'choice', instructions: 'Which power-up does `object` become in a battle game?', criteria: Object.fromEntries(REINFORCEMENT_IDS.map(id => [id, REINFORCEMENTS[id].examples])) },
};
export const ARENA_QUESTION: Record<string, LayaQuestion> = {
  arena: { type: 'choice', instructions: 'Which arena is shown in `scene`?', criteria: {
    kitchen: 'stove, fridge, counters, dishes', desk: 'office or study desk, monitor, papers',
    outdoors: 'nature, park, garden, trees, grass', bedroom: 'bed, sofa, living room',
    lab: 'tech lab, workshop, classroom, tools', street: 'city, road, sidewalk, parking lot',
  } },
};

export type Referee = 'laya' | 'gemini';

async function pick<T extends string>(state: Record<string, string>, questions: Record<string, LayaQuestion>, key: string, allowed: readonly T[], geminiPick: T): Promise<{ choice: T; decidedBy: Referee; confidence?: number }> {
  if (!layaConfigured()) return { choice: geminiPick, decidedBy: 'gemini' };
  try {
    const answer = readChoice((await askLaya(state, questions, { timeoutMs: SCENE_LAYA_TIMEOUT_MS }))[key], allowed);
    if (answer && answer.confidence >= SCENE_MIN_CONFIDENCE) return { choice: answer.choice, decidedBy: 'laya', confidence: Math.round(answer.confidence * 100) / 100 };
    console.info(`[referee] ${key}: decidedBy=gemini`, answer ? '(low confidence)' : '(invalid answer)');
  } catch (error) {
    // Unavailable or slow: keep Gemini's pick. Never log the photo description.
    console.info(`[referee] ${key}: decidedBy=gemini`, error instanceof Error && error.message === 'Laya timed out' ? '(timeout)' : '(unavailable)');
  }
  return { choice: geminiPick, decidedBy: 'gemini' };
}

export function refereeReinforcement(objectName: string, geminiPick: ReinforcementItem) {
  return pick({ object: objectName }, REINFORCEMENT_QUESTION, 'item', REINFORCEMENT_IDS, geminiPick);
}
export function refereeArena(scene: string, geminiPick: ArenaId) {
  return pick({ scene }, ARENA_QUESTION, 'arena', ARENA_IDS, geminiPick);
}
