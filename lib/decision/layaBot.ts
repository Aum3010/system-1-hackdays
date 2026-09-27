import type { CoreMove } from '@/types/battle';
import { describeForLaya, type BotSummary, type MovePrediction } from '../game/bot';
import { askLaya, readChoice, type LayaQuestion } from './layaClient';

/** Solo mode: Laya predicts the human's next move; lib/game/bot.ts picks the counter. ~0.7 s on CPU. */
export const BOT_LAYA_TIMEOUT_MS = 5000;
export const BOT_QUESTION: Record<string, LayaQuestion> = {
  next: { type: 'choice', instructions: 'Predict the move player A will pick next, based on the habits in `history`.', criteria: {
    strike: 'a fast attack', guard: 'a block', break: 'a guard-smashing attack', special: 'a big energy move',
  } },
};
const MOVES: CoreMove[] = ['strike', 'guard', 'break', 'special'];

export async function predictHumanMove(summary: BotSummary, timeoutMs = BOT_LAYA_TIMEOUT_MS): Promise<MovePrediction> {
  const answer = readChoice((await askLaya({ history: describeForLaya(summary) }, BOT_QUESTION, { timeoutMs })).next, MOVES);
  if (!answer || MOVES.some(m => typeof answer.probabilities[m] !== 'number')) throw new Error('Invalid Laya response');
  return Object.fromEntries(MOVES.map(m => [m, answer.probabilities[m]])) as MovePrediction;
}
