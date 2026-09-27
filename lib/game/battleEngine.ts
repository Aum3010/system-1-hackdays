import type { BattleMove, BattleState, BattleStatus, ClashResult, CoreMove, PlayerSlot, ReinforcementItem, RoundEvent } from '@/types/battle';
import type { GameCharacter } from '@/types/game';
import { typeMultiplier } from './typeChart';
import { TRAITS } from './traits';
import { ARENAS, ARENA_BUFF, REINFORCEMENTS, type ArenaId } from './arenas';

/**
 * Simultaneous-pick combat. Each round both players secretly choose a move, then
 * the pair resolves via the counter triangle below. No move beats every other move,
 * so the best play is a mixed strategy (reading and bluffing), not a fixed sequence.
 *
 *   Strike beats Break (interrupts it)   Guard beats Strike (block + counter)
 *   Break beats Guard (smash + drain)    Special beats Strike and Break, loses to Guard
 *
 * Signature Traits bend exactly one rule each (see traits.ts). Call It, Snap
 * Reinforcement and arenas are once-per-match or pre-match modifiers. No AI calls here.
 */
export const MAX_ROUNDS = 12;
export const MAX_ENERGY = 5;
export const START_ENERGY = 0;
export const SPECIAL_COST = 3;
export const CORE_MOVES: readonly CoreMove[] = ['strike', 'guard', 'break', 'special'];
/** The four counter-triangle moves (Snap is a separate once-per-match action). */
export const BATTLE_MOVES = CORE_MOVES;
/** A single hit can never exceed this share of the target's max HP, so nothing one-shots. */
export const HIT_CAP = .5;
/** Call It: a correct guess boosts your hit; a wrong guess makes you take more. */
export const CALL_BONUS = 1.5;
export const CALL_PENALTY = 1.25;
export const BURN_DAMAGE = 4;
export const TRAP_DAMAGE = 10;

/** [damage multiplier I deal, my result] for (my move, their move). Symmetric by construction. */
export const CLASH_TABLE: Record<CoreMove, Record<CoreMove, readonly [number, ClashResult]>> = {
  strike: { strike: [1, 'clash'], guard: [0, 'blocked'], break: [1, 'hit'], special: [0, 'interrupted'] },
  guard: { strike: [.6, 'countered'], guard: [0, 'focus'], break: [0, 'broken'], special: [1, 'countered'] },
  break: { strike: [0, 'interrupted'], guard: [1.2, 'hit'], break: [.5, 'clash'], special: [0, 'interrupted'] },
  special: { strike: [1.8, 'hit'], guard: [.25, 'blocked'], break: [1.8, 'hit'], special: [1.2, 'clash'] },
};
/** What each move deals to a player who spent the round snapping a reinforcement. */
const OPEN_HIT: Record<BattleMove, number> = { strike: 1, guard: 0, break: 1, special: 1.8, snap: 0 };

const SLOTS: PlayerSlot[] = ['player1', 'player2'];
const other = (slot: PlayerSlot): PlayerSlot => slot === 'player1' ? 'player2' : 'player1';
const hpKey = (slot: PlayerSlot) => slot === 'player1' ? 'player1Hp' as const : 'player2Hp' as const;
const noStatus = (): BattleStatus => ({ shield: 0, trap: false, burn: 0, snared: 0 });

export const specialCost = (fighter: GameCharacter) => fighter.trait === 'shatter' ? 2 : SPECIAL_COST;

export function createBattle(player1: GameCharacter, player2: GameCharacter, seed = 2026, options: { arena?: ArenaId } = {}): BattleState {
  if (player1.id === player2.id) player2 = { ...player2, id: `${player2.id}-challenger` };
  const startEnergy = (fighter: GameCharacter) => fighter.trait === 'charged' ? 2 : START_ENERGY;
  return {
    player1, player2, player1Hp: player1.combat.maxHp, player2Hp: player2.combat.maxHp, status: 'battle',
    log: [], notes: [], energy: { player1: startEnergy(player1), player2: startEnergy(player2) }, round: 0, seed: seed >>> 0,
    callUsed: { player1: false, player2: false }, snapUsed: { player1: false, player2: false }, pendingSnaps: [],
    effects: { player1: noStatus(), player2: noStatus() },
    ...(options.arena ? { arena: options.arena } : {}),
  };
}

export function canUse(state: BattleState, slot: PlayerSlot, move: BattleMove): boolean {
  if (move === 'snap') return !state.snapUsed[slot];
  return CORE_MOVES.includes(move) && (move !== 'special' || state.energy[slot] >= specialCost(state[slot]));
}
export const canCall = (state: BattleState, slot: PlayerSlot) => !state.callUsed[slot];

/**
 * Resolves one round of simultaneous picks. `calls` holds each player's optional
 * once-per-match Call It guess of the rival's move. Illegal input returns the same state object.
 */
export function resolveRound(state: BattleState, move1: BattleMove, move2: BattleMove, calls: Partial<Record<PlayerSlot, BattleMove>> = {}): BattleState {
  if (state.status === 'finished' || !canUse(state, 'player1', move1) || !canUse(state, 'player2', move2)) return state;
  for (const slot of SLOTS) {
    const guess = calls[slot];
    if (guess !== undefined && (!canCall(state, slot) || !(CORE_MOVES as readonly string[]).concat('snap').includes(guess))) return state;
  }
  const moves: Record<PlayerSlot, BattleMove> = { player1: move1, player2: move2 };
  const callResults: RoundEvent['calls'] = {};
  for (const slot of SLOTS) {
    const guess = calls[slot];
    if (guess !== undefined) callResults[slot] = { guess, correct: guess === moves[other(slot)] };
  }
  let seed = state.seed;
  // Seeded LCG makes matches replayable: randomness belongs to application code, never AI.
  const roll = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return .92 + (seed / 4294967296) * .16; };
  // Snare steals the speed tiebreak for a round.
  const snared = (slot: PlayerSlot) => state.effects[slot].snared > 0;
  const naturallyFaster: PlayerSlot = state.player1.combat.speed >= state.player2.combat.speed ? 'player1' : 'player2';
  const faster: PlayerSlot = snared(naturallyFaster) && !snared(other(naturallyFaster)) ? other(naturallyFaster) : naturallyFaster;
  const tieIsReal = state.player1.combat.speed !== state.player2.combat.speed || snared('player1') !== snared('player2');

  const effects = { player1: { ...state.effects.player1 }, player2: { ...state.effects.player2 } };
  const hitTaken = { player1: 0, player2: 0 };
  const extraTaken = { player1: 0, player2: 0 };
  const result = {} as Record<PlayerSlot, ClashResult>;
  const superEffective = { player1: false, player2: false };
  const triggered: Partial<Record<PlayerSlot, string>> = {};
  const extras: string[] = [];
  const trigger = (slot: PlayerSlot) => { const trait = state[slot].trait; if (trait) triggered[slot] = TRAITS[trait].name; };

  for (const slot of SLOTS) {
    const target = other(slot);
    const mine = moves[slot], theirs = moves[target];
    const myTrait = state[slot].trait, theirTrait = state[target].trait;
    let mult: number;
    let outcome: ClashResult;
    if (mine === 'snap') [mult, outcome] = [0, 'snapping'];
    else if (theirs === 'snap') { mult = OPEN_HIT[mine]; outcome = mult > 0 ? 'hit' : 'focus'; }
    else [mult, outcome] = CLASH_TABLE[mine][theirs];

    // Signature Traits: each bends exactly one cell of the table.
    if (myTrait === 'pierce' && mine === 'strike' && theirs === 'guard') { mult = .3; trigger(slot); }
    if (myTrait === 'rebound' && mine === 'guard' && theirs === 'break') { mult = .4; trigger(slot); }
    if (myTrait === 'bulwark' && mine === 'guard' && theirs === 'strike') { mult = .8; trigger(slot); }
    if (theirTrait === 'slippery' && mine === 'special' && mult === 1.8) { mult = 1.4; trigger(target); }
    if (theirTrait === 'cushion' && mine === 'break' && mult > 0) { mult *= .75; trigger(target); }
    if (theirTrait === 'shatter' && mult > 0) mult *= 1.1;
    result[slot] = outcome;

    const variation = roll();
    if (mult === 0) continue;
    const attacker = state[slot].combat, defender = state[target].combat;
    const typeMult = typeMultiplier(state[slot].type.primary, state[target].type.primary);
    // Speed matters when both players commit to the same move: the quicker fighter lands cleaner.
    const speedEdge = mine === theirs && slot === faster && tieIsReal ? (myTrait === 'rush' ? 1.25 : 1.1) : 1;
    if (speedEdge === 1.25) trigger(slot);
    const arenaMult = state.arena && ARENAS[state.arena].buff === state[slot].type.primary ? ARENA_BUFF : 1;
    const callMult = (callResults[slot]?.correct ? CALL_BONUS : 1) * (callResults[target] && !callResults[target].correct ? CALL_PENALTY : 1);
    const base = Math.max(6, attacker.attack * .42 * typeMult * variation - defender.defense * .12);
    let damage = base * mult * speedEdge * arenaMult * callMult;
    if (effects[target].shield > 0) { damage *= .5; effects[target].shield--; extras.push(`${state[target].identity.name}'s shield soaks half.`); }
    if (effects[target].trap) {
      damage *= .5; effects[target].trap = false; extraTaken[slot] += TRAP_DAMAGE;
      extras.push(`Trap sprung! ${state[slot].identity.name} takes ${TRAP_DAMAGE}.`);
    }
    hitTaken[target] = Math.min(Math.ceil(defender.maxHp * HIT_CAP), Math.max(3, Math.round(damage)));
    superEffective[slot] = typeMult > 1;
  }

  // Burns from earlier Scald counters tick, then statuses age, then new statuses land (active next round).
  for (const slot of SLOTS) {
    if (state.effects[slot].burn > 0) { extraTaken[slot] += BURN_DAMAGE; effects[slot].burn--; extras.push(`${state[slot].identity.name} burns for ${BURN_DAMAGE}.`); }
    effects[slot].snared = Math.max(0, effects[slot].snared - 1);
  }
  for (const slot of SLOTS) {
    if (result[slot] !== 'countered' || hitTaken[other(slot)] === 0) continue;
    if (state[slot].trait === 'scald') { effects[other(slot)].burn = 2; trigger(slot); }
    if (state[slot].trait === 'snare') { effects[other(slot)].snared = 1; trigger(slot); }
  }

  const energy = { ...state.energy };
  for (const slot of SLOTS) {
    const trait = state[slot].trait;
    let value = energy[slot] - (moves[slot] === 'special' ? specialCost(state[slot]) : 0) + 1;
    if (moves[slot] === 'guard') {
      if (result[slot] === 'broken') value -= state[other(slot)].trait === 'crush' ? 3 : 2;
      else value += moves[other(slot)] === 'guard' && trait === 'flow' ? 2 : 1;
    }
    if (moves[slot] === 'guard' && moves[other(slot)] === 'guard' && trait === 'flow') trigger(slot);
    if (result[slot] === 'broken' && state[other(slot)].trait === 'crush') trigger(other(slot));
    energy[slot] = Math.max(0, Math.min(MAX_ENERGY, value));
  }

  const next: BattleState = {
    ...state, energy, seed, round: state.round + 1, log: [...state.log], effects,
    callUsed: { player1: state.callUsed.player1 || calls.player1 !== undefined, player2: state.callUsed.player2 || calls.player2 !== undefined },
    snapUsed: { player1: state.snapUsed.player1 || move1 === 'snap', player2: state.snapUsed.player2 || move2 === 'snap' },
    pendingSnaps: [...state.pendingSnaps, ...SLOTS.filter(slot => moves[slot] === 'snap')],
  };
  const actual = {
    player1: Math.min(state.player1Hp, hitTaken.player1 + extraTaken.player1),
    player2: Math.min(state.player2Hp, hitTaken.player2 + extraTaken.player2),
  };
  next.player1Hp = state.player1Hp - actual.player1;
  next.player2Hp = state.player2Hp - actual.player2;

  let message = describe(state, moves, hitTaken, superEffective);
  for (const slot of SLOTS) {
    const call = callResults[slot];
    if (call) message += call.correct ? ` CALLED IT! P${slot === 'player1' ? 1 : 2} read the ${call.guess}.` : ` P${slot === 'player1' ? 1 : 2}'s call missed.`;
  }
  if (extras.length) message += ` ${extras.join(' ')}`;
  const ko1 = next.player1Hp === 0, ko2 = next.player2Hp === 0;
  if (ko1 || ko2) {
    next.status = 'finished';
    // Double KO: whoever dealt more this round wins; speed breaks exact ties.
    const winner: PlayerSlot = ko1 && ko2 ? (actual.player2 > actual.player1 ? 'player1' : actual.player1 > actual.player2 ? 'player2' : faster) : ko1 ? 'player2' : 'player1';
    next.winnerId = next[winner].id;
    if (ko1 && ko2) message += ` Double knockout! ${next[winner].identity.name} was left standing a split second longer.`;
  } else if (next.round >= MAX_ROUNDS) {
    // A round limit keeps live demos short even if both players turtle.
    const first = next.player1Hp / next.player1.combat.maxHp, second = next.player2Hp / next.player2.combat.maxHp;
    const winner: PlayerSlot = first === second ? faster : first > second ? 'player1' : 'player2';
    next.status = 'finished';
    next.winnerId = next[winner].id;
    message += ` Time! ${next[winner].identity.name} wins on remaining health.`;
  }
  if (next.status === 'finished') next.pendingSnaps = [];
  next.log.push({ round: next.round, moves, damageTaken: actual, result, energyAfter: energy, superEffective, calls: callResults, traitsTriggered: triggered, message });
  return next;
}

/** Applies (or forfeits, with `item = null`) a pending Snap Reinforcement. Pure; item effects are fixed here. */
export function applyReinforcement(state: BattleState, slot: PlayerSlot, item: ReinforcementItem | null, objectName?: string): BattleState {
  if (!state.pendingSnaps.includes(slot)) return state;
  const next: BattleState = { ...state, pendingSnaps: state.pendingSnaps.filter(s => s !== slot), notes: [...state.notes], effects: { ...state.effects, [slot]: { ...state.effects[slot] } }, energy: { ...state.energy } };
  const name = state[slot].identity.name;
  if (state.status === 'finished') return next;
  if (!item) {
    next.notes.push({ afterRound: state.round, slot, message: `${name}'s reinforcement run came back empty-handed.` });
    return next;
  }
  const key = hpKey(slot);
  if (item === 'heal') next[key] = Math.min(state[slot].combat.maxHp, state[key] + Math.round(state[slot].combat.maxHp * .25));
  if (item === 'shield') next.effects[slot].shield = 2;
  if (item === 'energy') next.energy[slot] = Math.min(MAX_ENERGY, state.energy[slot] + 3);
  if (item === 'trap') next.effects[slot].trap = true;
  next.notes.push({ afterRound: state.round, slot, message: `${name} grabbed ${objectName ? `a ${objectName}` : 'a reinforcement'}: ${REINFORCEMENTS[item].name.toUpperCase()}! ${REINFORCEMENTS[item].effect}` });
  return next;
}

const MOVE_NAMES: Record<BattleMove, string> = { strike: 'Strike', guard: 'Guard', break: 'Break', special: 'Special', snap: 'Snap' };

function describe(state: BattleState, moves: Record<PlayerSlot, BattleMove>, taken: Record<PlayerSlot, number>, effective: Record<PlayerSlot, boolean>): string {
  const name = (slot: PlayerSlot) => state[slot].identity.name;
  const special = (slot: PlayerSlot) => state[slot].abilities.specialAttack.name;
  const dealt = (slot: PlayerSlot) => taken[other(slot)];
  const tail = SLOTS.some(slot => effective[slot] && dealt(slot) > 0) ? " It's super effective!" : '';
  const [a, b] = SLOTS;
  if (moves[a] === 'snap' || moves[b] === 'snap') {
    if (moves[a] === moves[b]) return 'Both players scramble for reinforcements!';
    const snapper = moves[a] === 'snap' ? a : b, rival = other(snapper);
    return `${name(snapper)} dives for a reinforcement! ${dealt(rival) > 0 ? `${name(rival)} punishes the opening for ${dealt(rival)}.${tail}` : `${name(rival)} just watches.`}`;
  }
  if (moves[a] === moves[b]) {
    const both = `${name(a)} takes ${taken[a]}, ${name(b)} takes ${taken[b]}.`;
    if (moves[a] === 'guard') return `Both fighters guard and size each other up. Bonus energy all round.`;
    if (moves[a] === 'special') return `${special(a)} collides with ${special(b)}! ${both}${tail}`;
    return `Both go for a ${MOVE_NAMES[moves[a]]}! ${both}${tail}`;
  }
  const core = moves as Record<PlayerSlot, CoreMove>;
  // Order the pair so `x` is the winner of the exchange where there is one.
  const [x, y] = CLASH_TABLE[core[a]][core[b]][0] >= CLASH_TABLE[core[b]][core[a]][0] ? [a, b] : [b, a];
  const pair = `${core[x]}>${core[y]}`;
  const chip = dealt(y) > 0 ? ` (${dealt(y)} back)` : '';
  switch (pair) {
    case 'guard>strike': return `${name(x)} read the Strike: blocked and countered for ${dealt(x)}!${chip}${tail}`;
    case 'strike>break': return `${name(x)} strikes first and interrupts ${name(y)}'s Break for ${dealt(x)}!${tail}`;
    case 'break>guard': return `${name(x)} smashes through ${name(y)}'s Guard for ${dealt(x)} and drains its energy!${chip}${tail}`;
    case 'guard>special': return `${name(x)} saw ${special(y)} coming: blocked (${dealt(y)} chip) and countered for ${dealt(x)}!${tail}`;
    default: return `${name(x)} unleashes ${special(x)} for ${dealt(x)}! ${name(y)}'s ${MOVE_NAMES[core[y]]} never lands.${tail}`;
  }
}
