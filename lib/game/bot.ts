import type { BattleMove, BattleState, CoreMove, PlayerSlot } from '@/types/battle';
import { CLASH_TABLE, CORE_MOVES, canUse, specialCost } from './battleEngine';
import { STRATEGIES } from './simulate';

/**
 * Solo mode opponent. The split of work:
 *   Laya  predicts the human's next move from their history (it spots repeats and alternation well;
 *         asked to pick a counter directly, it just mirrored the human's last move).
 *   Code  blends that prediction with the human's actual recent move frequencies, then picks by
 *         expected value from CLASH_TABLE with a softmax sample, so the bot stays a mixed strategy.
 *         The blend matters: against a guard-only player with a full energy bar, Laya alone kept
 *         predicting "special" (the player *could* afford one), the bot guarded back, and it won 4/10.
 * Pure: no fetch, no React. Without a prediction the proven `reader` strategy plays instead.
 */
export type MovePrediction = Record<CoreMove, number>;
export interface BotSummary { opponentMoves: CoreMove[]; opponentEnergy: number; opponentSpecialReady: boolean; botEnergy: number; round: number }

/** Softmax temperature over expected values: lower = greedier, higher = more random. */
export const BOT_TEMPERATURE = .3;
/** Share of the prediction replaced by a uniform guess, so one confident misread can't be farmed. */
export const BOT_DOUBT = .15;
/** Weight of Laya's prediction versus the human's move frequencies over the last HABIT_WINDOW rounds. */
export const LAYA_WEIGHT = .5;
export const HABIT_WINDOW = 4;

const rival = (slot: PlayerSlot): PlayerSlot => slot === 'player1' ? 'player2' : 'player1';
const isCore = (move: BattleMove): move is CoreMove => (CORE_MOVES as readonly string[]).includes(move);

/** Compact, structured view of the match that is sent to the server (the server words it for Laya). */
export function summarizeForBot(state: BattleState, botSlot: PlayerSlot): BotSummary {
  const human = rival(botSlot);
  return {
    opponentMoves: state.log.map(e => e.moves[human]).filter(isCore).slice(-6),
    opponentEnergy: state.energy[human],
    opponentSpecialReady: state.energy[human] >= specialCost(state[human]),
    botEnergy: state.energy[botSlot],
    round: state.round,
  };
}

export function describeForLaya(summary: BotSummary): string {
  const moves = summary.opponentMoves.length ? `Player A's moves so far, oldest first: ${summary.opponentMoves.join(', ')}.` : 'Player A has not moved yet.';
  return `${moves} A has ${summary.opponentEnergy} energy${summary.opponentSpecialReady ? ' and can afford a special' : ''}.`;
}

/** Removes impossible moves (a Special the human can't afford), adds doubt, renormalises. */
export function cleanPrediction(prediction: Partial<MovePrediction>, specialReady: boolean): MovePrediction {
  const raw = Object.fromEntries(CORE_MOVES.map(m => [m, m === 'special' && !specialReady ? 0 : Math.max(0, prediction[m] ?? 0)])) as MovePrediction;
  const legal = CORE_MOVES.filter(m => m !== 'special' || specialReady);
  const total = legal.reduce((sum, m) => sum + raw[m], 0);
  return Object.fromEntries(CORE_MOVES.map(m => [m, !legal.includes(m) ? 0 : (1 - BOT_DOUBT) * (total > 0 ? raw[m] / total : 1 / legal.length) + BOT_DOUBT / legal.length])) as MovePrediction;
}

/** Expected (damage dealt - damage taken) multiplier for each of my moves against the predicted mix. */
export function expectedValues(prediction: MovePrediction): MovePrediction {
  return Object.fromEntries(CORE_MOVES.map(mine => [mine, CORE_MOVES.reduce((ev, theirs) => ev + prediction[theirs] * (CLASH_TABLE[mine][theirs][0] - CLASH_TABLE[theirs][mine][0]), 0)])) as MovePrediction;
}

/** Laplace-smoothed frequencies of the human's recent moves, or null before the first round. */
export function habitFrequencies(state: BattleState, human: PlayerSlot): MovePrediction | null {
  const recent = state.log.slice(-HABIT_WINDOW).map(e => e.moves[human]).filter(isCore);
  if (!recent.length) return null;
  const counts: MovePrediction = { strike: .5, guard: .5, break: .5, special: .5 };
  for (const move of recent) counts[move] += 1;
  const total = CORE_MOVES.reduce((sum, m) => sum + counts[m], 0);
  return Object.fromEntries(CORE_MOVES.map(m => [m, counts[m] / total])) as MovePrediction;
}

export function blendPrediction(laya: Partial<MovePrediction>, habits: MovePrediction | null): Partial<MovePrediction> {
  if (!habits) return laya;
  return Object.fromEntries(CORE_MOVES.map(m => [m, LAYA_WEIGHT * (laya[m] ?? 0) + (1 - LAYA_WEIGHT) * habits[m]])) as MovePrediction;
}

export function botMove(state: BattleState, botSlot: PlayerSlot, prediction: Partial<MovePrediction> | null, rand: () => number): BattleMove {
  if (!prediction) return STRATEGIES.reader(state, botSlot, rand);
  const human = rival(botSlot);
  const blended = blendPrediction(prediction, habitFrequencies(state, human));
  const ev = expectedValues(cleanPrediction(blended, state.energy[human] >= specialCost(state[human])));
  const options = CORE_MOVES.filter(m => canUse(state, botSlot, m));
  const weights = options.map(m => Math.exp(ev[m] / BOT_TEMPERATURE));
  let x = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < options.length; i++) if ((x -= weights[i]) < 0) return options[i];
  return options[0];
}
