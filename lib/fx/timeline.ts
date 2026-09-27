import type { BattleState, PlayerSlot, RoundEvent } from '@/types/battle';
import type { BattleLineEvent } from '@/types/object';
import type { GameCharacter } from '@/types/game';
import type { AnnouncerEvent } from '@/lib/validation/lore';
import { announcerLine } from './announcer';

/**
 * Presentation-only: turns one resolved round (previous state -> next state) into an
 * ordered animation script. Pure and deterministic, so it is unit-tested without a DOM.
 * It never changes game data; the UI just replays these steps.
 */
export type CalloutTone = 'counter' | 'break' | 'special' | 'mirror' | 'guard' | 'hit' | 'snap' | 'call';
export type FxEvent =
  | { type: 'countdown'; value: 3 | 2 | 1 }
  | { type: 'reveal' }
  | { type: 'callout'; text: string; tone: CalloutTone }
  | { type: 'trait'; slot: PlayerSlot; name: string }
  | { type: 'hitstop' }
  | { type: 'hit'; target: PlayerSlot; amount: number; heavy: boolean }
  | { type: 'hp'; target: PlayerSlot; from: number; to: number }
  | { type: 'energy'; slot: PlayerSlot; from: number; to: number }
  | { type: 'line'; slot: PlayerSlot; event: BattleLineEvent; text: string }
  | { type: 'announce'; text: string }
  | { type: 'ko'; loser: PlayerSlot }
  | { type: 'done' };
export interface FxStep { at: number; event: FxEvent }

export const FX_TIMING = { countdown: 350, flip: 350, callout: 300, hitstop: 80, hit: 350, hpDelay: 120, energy: 150, line: 200, koHold: 900 };
const SLOTS: PlayerSlot[] = ['player1', 'player2'];
const other = (slot: PlayerSlot): PlayerSlot => slot === 'player1' ? 'player2' : 'player1';

/** Headline for the clash, derived only from the resolved outcome. */
export function clashCallout(event: RoundEvent): { text: string; tone: CalloutTone } {
  const { moves, result } = event;
  if (moves.player1 === 'snap' || moves.player2 === 'snap') return { text: 'SNAP!', tone: 'snap' };
  if (moves.player1 === moves.player2) {
    if (moves.player1 === 'guard') return { text: 'BOTH GUARD', tone: 'guard' };
    if (moves.player1 === 'special') return { text: 'SPECIAL CLASH!', tone: 'special' };
    return { text: 'MIRROR CLASH', tone: 'mirror' };
  }
  if (SLOTS.some(s => result[s] === 'countered')) return { text: 'COUNTERED!', tone: 'counter' };
  if (SLOTS.some(s => result[s] === 'broken')) return { text: 'GUARD BROKEN!', tone: 'break' };
  if (SLOTS.some(s => moves[s] === 'special' && result[s] === 'hit')) return { text: 'SPECIAL!', tone: 'special' };
  return { text: 'INTERRUPTED!', tone: 'hit' };
}

const FALLBACK_LINES: Record<BattleLineEvent, string> = {
  opener: 'Let’s make this quick.', counter: 'Saw that coming.', guardBreak: 'Knock knock.', special: 'Here comes the big one!',
  calledIt: 'Called it!', comeback: 'Not done yet!', knockout: 'And stay down.', ouch: 'Okay, that one hurt.',
};
export const lineFor = (fighter: GameCharacter, event: BattleLineEvent) =>
  (event === 'opener' && fighter.lore?.trashTalk[0]) || fighter.personality.lines?.[event] || FALLBACK_LINES[event];

const MOVE_WORD: Record<string, string> = { strike: 'Strike', guard: 'Guard', break: 'Break', special: 'Special', snap: 'Snap' };
/** Which announcer moment this round was, and whose moment (their lore bank is used). */
export function announcerMoment(prev: BattleState, event: RoundEvent, next: BattleState): { event: AnnouncerEvent; owner: PlayerSlot } | null {
  const hp = (state: BattleState, slot: PlayerSlot) => slot === 'player1' ? state.player1Hp : state.player2Hp;
  if (next.status === 'finished' && next.winnerId) {
    const winner = SLOTS.find(s => next[s].id === next.winnerId)!;
    if (hp(next, other(winner)) === 0) return { event: 'ko', owner: winner };
  }
  const line = pickLine(prev, event, next);
  if (line?.event === 'comeback') return { event: 'comeback', owner: line.slot };
  const { moves, result } = event;
  if (moves.player1 === 'snap' || moves.player2 === 'snap') return null;
  const seeded = next.seed % 2 === 0 ? 'player1' : 'player2';
  if (moves.player1 === moves.player2) return { event: moves.player1 === 'guard' ? 'bothGuard' : 'mirror', owner: seeded };
  const countered = SLOTS.find(s => result[s] === 'countered');
  if (countered) return { event: 'counter', owner: countered };
  const breaker = SLOTS.find(s => result[other(s)] === 'broken');
  if (breaker) return { event: 'guardBroken', owner: breaker };
  const special = SLOTS.find(s => moves[s] === 'special' && result[s] === 'hit');
  if (special) return { event: 'special', owner: special };
  const hitter = SLOTS.find(s => event.damageTaken[other(s)] > 0);
  return hitter ? { event: event.damageTaken[other(hitter)] >= prev[other(hitter)].combat.maxHp * .25 ? 'bigHit' : 'counter', owner: hitter } : null;
}
export function announceFor(prev: BattleState, event: RoundEvent, next: BattleState): string | null {
  const moment = announcerMoment(prev, event, next);
  if (!moment) return null;
  const self = next[moment.owner], rival = next[other(moment.owner)];
  return announcerLine(self.lore?.announcerBank, moment.event, { self: self.identity.name, opponent: rival.identity.name, move: MOVE_WORD[event.moves[moment.owner]] ?? 'move' }, next.seed ^ next.round);
}

/** At most one one-liner per round, from the fighter who owned the moment. */
export function pickLine(prev: BattleState, event: RoundEvent, next: BattleState): { slot: PlayerSlot; event: BattleLineEvent } | null {
  const hp = (state: BattleState, slot: PlayerSlot) => slot === 'player1' ? state.player1Hp : state.player2Hp;
  if (next.status === 'finished' && next.winnerId) {
    const winner = SLOTS.find(s => next[s].id === next.winnerId)!;
    if (hp(next, other(winner)) === 0) return { slot: winner, event: 'knockout' };
  }
  const caller = SLOTS.find(s => event.calls[s]?.correct);
  if (caller) return { slot: caller, event: 'calledIt' };
  for (const slot of SLOTS) {
    const dealt = event.damageTaken[other(slot)];
    const low = hp(prev, slot) / prev[slot].combat.maxHp < .35;
    if (low && dealt >= 12 && dealt > event.damageTaken[slot]) return { slot, event: 'comeback' };
  }
  const countered = SLOTS.find(s => event.result[s] === 'countered' && event.damageTaken[other(s)] > 0);
  if (countered) return { slot: countered, event: 'counter' };
  const breaker = SLOTS.find(s => event.result[other(s)] === 'broken');
  if (breaker) return { slot: breaker, event: 'guardBreak' };
  const special = SLOTS.find(s => event.moves[s] === 'special' && event.result[s] === 'hit');
  if (special) return { slot: special, event: 'special' };
  const hurt = SLOTS.find(s => event.damageTaken[s] >= prev[s].combat.maxHp * .25);
  if (hurt) return { slot: hurt, event: 'ouch' };
  return null;
}

/** Builds the ordered animation script for the latest round. `slowMo` stretches the final blow. */
export function deriveTimeline(prev: BattleState, next: BattleState, options: { slowMo?: boolean } = {}): FxStep[] {
  const event = next.log.at(-1);
  if (!event || next.round !== prev.round + 1) return [{ at: 0, event: { type: 'done' } }];
  const scale = options.slowMo && next.status === 'finished' ? 1.5 : 1;
  const T = Object.fromEntries(Object.entries(FX_TIMING).map(([k, v]) => [k, Math.round(v * scale)])) as typeof FX_TIMING;
  const steps: FxStep[] = [];
  let t = 0;
  const push = (e: FxEvent, advance = 0) => { steps.push({ at: t, event: e }); t += advance; };

  for (const value of [3, 2, 1] as const) push({ type: 'countdown', value }, T.countdown);
  push({ type: 'reveal' }, T.flip);
  const callout = clashCallout(event);
  push({ type: 'callout', ...callout });
  for (const slot of SLOTS) { const name = event.traitsTriggered[slot]; if (name) push({ type: 'trait', slot, name }); }
  if (SLOTS.some(s => event.calls[s]?.correct)) push({ type: 'callout', text: 'CALLED IT!', tone: 'call' });
  t += T.callout;
  if (callout.tone === 'counter' || callout.tone === 'special') push({ type: 'hitstop' }, T.hitstop);

  const hpOf = (state: BattleState, slot: PlayerSlot) => slot === 'player1' ? state.player1Hp : state.player2Hp;
  const hitSlots = SLOTS.filter(s => event.damageTaken[s] > 0);
  for (const target of hitSlots) push({ type: 'hit', target, amount: event.damageTaken[target], heavy: event.damageTaken[target] >= next[target].combat.maxHp * .25 });
  if (hitSlots.length) t += T.hpDelay;
  for (const target of hitSlots) push({ type: 'hp', target, from: hpOf(prev, target), to: hpOf(next, target) });
  if (hitSlots.length) t += T.hit;
  for (const slot of SLOTS) if (prev.energy[slot] !== next.energy[slot]) push({ type: 'energy', slot, from: prev.energy[slot], to: next.energy[slot] });
  t += T.energy;
  const announce = announceFor(prev, event, next);
  if (announce) push({ type: 'announce', text: announce });
  const line = pickLine(prev, event, next);
  if (line) push({ type: 'line', slot: line.slot, event: line.event, text: lineFor(next[line.slot], line.event) }, T.line);
  if (next.status === 'finished') {
    const loser = SLOTS.find(s => next[s].id !== next.winnerId)!;
    if (hpOf(next, loser) === 0) push({ type: 'ko', loser }, T.koHold);
  }
  push({ type: 'done' });
  return steps;
}

/** Collapsed timeline for "Skip animations" / reduced motion: final state at once, text callouts kept. */
export function instantTimeline(prev: BattleState, next: BattleState): FxStep[] {
  return deriveTimeline(prev, next).filter(s => !['countdown', 'hitstop'].includes(s.event.type)).map(s => ({ ...s, at: 0 }));
}
