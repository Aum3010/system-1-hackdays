import type { BattleMove, BattleState, CoreMove, PlayerSlot } from '@/types/battle';
import type { GameCharacter } from '@/types/game';
import { canUse, createBattle, resolveRound, specialCost } from './battleEngine';

/** Balance tooling: scripted strategies and a match runner. Used by tests and scripts/simulate.ts. */
export type Strategy = (state: BattleState, me: PlayerSlot, rand: () => number) => BattleMove;
const rival = (slot: PlayerSlot): PlayerSlot => slot === 'player1' ? 'player2' : 'player1';
const weighted = (r: number, options: [CoreMove, number][]): CoreMove => {
  let x = r * options.reduce((sum, [, w]) => sum + w, 0);
  for (const [move, w] of options) if ((x -= w) < 0) return move;
  return options[0][0];
};
const withSpecial = (state: BattleState, me: PlayerSlot, options: [CoreMove, number][], weight: number): [CoreMove, number][] =>
  canUse(state, me, 'special') ? [...options, ['special', weight]] : options;

export const STRATEGIES: Record<string, Strategy> = {
  random: (s, me, r) => weighted(r(), withSpecial(s, me, [['strike', 1], ['guard', 1], ['break', 1]], 1)),
  specialSpam: (s, me) => canUse(s, me, 'special') ? 'special' : 'strike',
  strikeOnly: () => 'strike',
  guardOnly: () => 'guard',
  breakOnly: () => 'break',
  /** Near-equilibrium mix; guards more when the rival can afford a Special. */
  mixed: (s, me, r) => {
    const threat = s.energy[rival(me)] >= specialCost(s[rival(me)]);
    return weighted(r(), withSpecial(s, me, [['strike', .4], ['guard', threat ? .5 : .33], ['break', .22]], .25));
  },
  /**
   * Punishes patterns: counters the rival's most frequent recent move. Only respects the
   * Special threat if the rival has actually used a Special (fixes the earlier heuristic
   * that kept guarding against a break-only player who never spent energy).
   */
  reader: (s, me, r) => {
    const history = s.log.slice(-4).map(e => e.moves[rival(me)]);
    const threat = s.energy[rival(me)] >= specialCost(s[rival(me)]) && s.log.some(e => e.moves[rival(me)] === 'special');
    if (threat && r() < .6) return 'guard';
    if (history.length >= 2) {
      const counts = new Map<BattleMove, number>();
      for (const move of history) counts.set(move, (counts.get(move) ?? 0) + 1);
      const [top, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const counter: Record<BattleMove, CoreMove> = { strike: 'guard', guard: 'break', break: 'strike', special: 'guard', snap: 'strike' };
      if (n / history.length >= .5 && r() < .8) return counter[top];
    }
    return STRATEGIES.mixed(s, me, r);
  },
};

export function playMatch(p1: GameCharacter, p2: GameCharacter, s1: Strategy, s2: Strategy, seed: number, rand: () => number): BattleState {
  let state = createBattle(p1, p2, seed);
  while (state.status !== 'finished') state = resolveRound(state, s1(state, 'player1', rand), s2(state, 'player2', rand));
  return state;
}

export function seededRandom(seed: number) {
  let value = seed % 2147483647 || 1;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}

/** Win rate of strategy A vs B across all pairings and both seats. */
export function winRate(fighters: GameCharacter[], a: Strategy, b: Strategy, gamesPerPairing = 100, seed = 7): number {
  const rand = seededRandom(seed);
  let wins = 0, games = 0;
  for (const f1 of fighters) for (const f2 of fighters) for (let g = 0; g < gamesPerPairing; g++) {
    const first = playMatch(f1, f2, a, b, g, rand);
    if (first.winnerId === first.player1.id) wins++;
    const second = playMatch(f2, f1, b, a, g, rand);
    if (second.winnerId === second.player2.id) wins++;
    games += 2;
  }
  return wins / games;
}
