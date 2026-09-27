import assert from 'node:assert/strict';
import test from 'node:test';
import type { ObjectAnalysis, TraitLevel } from '../types/object';
import type { CharacterDecision, CombatClass } from '../types/game';
import { FallbackDecisionEngine } from '../lib/decision/FallbackDecisionEngine';
import { LayaDecisionEngine, LAYA_QUESTIONS } from '../lib/decision/LayaDecisionEngine';
import { DecisionEngineService } from '../lib/decision/DecisionEngineService';
import { generateStats } from '../lib/game/statEngine';
import { createCharacter } from '../lib/game/characterEngine';
import { createBattle, resolveRound, canUse, canCall, applyReinforcement, BATTLE_MOVES, CLASH_TABLE, MAX_ROUNDS, SPECIAL_COST, HIT_CAP, BURN_DAMAGE, TRAP_DAMAGE } from '../lib/game/battleEngine';
import { STRATEGIES, playMatch, seededRandom, winRate } from '../lib/game/simulate';
import { TRAIT_IDS } from '../lib/game/traits';
import { pickTrait } from '../lib/decision/FallbackDecisionEngine';
import type { SignatureTrait, GameCharacter } from '../types/game';
import type { BattleMove, BattleState, CoreMove, PlayerSlot } from '../types/battle';
import { DEMO_FIGHTERS } from '../lib/game/demo';
import { typeMultiplier } from '../lib/game/typeChart';
import { GameCharacterSchema } from '../lib/validation/schemas';

function object(name: string, materials: string[] = ['plastic']): ObjectAnalysis {
  return {
    objectName: name, category: 'everyday_object', materials, confidence: .96,
    properties: { durability: 'high', mobility: 'low', weight: 'medium', sharpness: 'low', fragility: 'low', flexibility: 'low', electronic: false },
    creative: { suggestedCharacterName: `${name} fighter`, suggestedDescription: 'A worthy contender.', suggestedSpecialAbility: 'Impact wave' },
  };
}

test('fallback maps recognizable objects deterministically without APIs', async () => {
  const fallback = new FallbackDecisionEngine();
  const fixtures = [
    [object('Water bottle', ['steel']), 'water'], [object('Laptop', ['aluminum']), 'electric'],
    [object('Keyboard'), 'electric'], [object('Shoe', ['rubber']), 'chaos'],
    [object('Chair', ['wood']), 'nature'], [object('Stapler', ['metal']), 'metal'],
    [object('Coffee mug', ['ceramic']), 'heat'], [object('Backpack', ['nylon']), 'chaos'],
    [object('Plant', ['plant']), 'nature'],
  ] as const;
  for (const [analysis, type] of fixtures) {
    analysis.properties.electronic = /Laptop|Keyboard/.test(analysis.objectName);
    const first = await fallback.classify(analysis);
    assert.equal(first.primaryType, type, analysis.objectName);
    assert.equal(first.decisionProvider, 'fallback');
    assert.deepEqual(first, await fallback.classify(analysis));
  }
});

test('all demo fighters conform to the shared game schema', () => {
  for (const fighter of DEMO_FIGHTERS) assert.equal(GameCharacterSchema.safeParse(fighter).success, true, fighter.identity.name);
});

test('all classes and extreme trait combinations stay bounded', () => {
  const classes: CombatClass[] = ['tank','fighter','speedster','trickster','glass_cannon','balanced','support'];
  const tiers: TraitLevel[] = ['very_low','low','medium','high','very_high'];
  for (const combatClass of classes) for (const tier of tiers) {
    const analysis = object('Sharp heavy fragile metal machine', ['metal']);
    analysis.properties = { durability: tier, mobility: tier, weight: tier, sharpness: tier, fragility: tier, flexibility: tier, electronic: true };
    const decision: CharacterDecision = { combatClass, primaryType: 'metal', attackTier: tier, defenseTier: tier, healthTier: tier, speedTier: tier, decisionProvider: 'fallback' };
    const stats = generateStats(analysis, decision);
    for (const value of [stats.hp, stats.maxHp, stats.attack, stats.defense, stats.speed]) {
      assert.ok(Number.isInteger(value) && value >= 20 && value <= 100);
    }
    assert.deepEqual(stats, generateStats(analysis, decision));
  }
});

test('rarity has no influence on stats and rejected analysis cannot create a fighter', async () => {
  const analysis = object('Spoon');
  const decision = await new FallbackDecisionEngine().classify(analysis);
  const common = createCharacter(analysis, decision, '/example.jpg');
  const absurd = createCharacter({ ...analysis, objectName: 'Rubber duck' }, decision, '/example.jpg');
  assert.notEqual(common.identity.rarity, absurd.identity.rarity);
  assert.deepEqual(common.combat, absurd.combat);
  assert.throws(() => createCharacter({ ...analysis, rejected: true }, decision, '/example.jpg'));
  assert.throws(() => createCharacter({ ...analysis, confidence: .2 }, decision, '/example.jpg'));
});

/** Plays until finished with a per-slot strategy; returns the final state. */
function play(initial: BattleState, pick: (state: BattleState, slot: PlayerSlot) => BattleMove) {
  let state = initial;
  while (state.status !== 'finished') {
    const next = resolveRound(state, pick(state, 'player1'), pick(state, 'player2'));
    assert.notEqual(next, state, 'strategy produced an illegal move');
    state = next;
  }
  return state;
}
const specialSpam = (state: BattleState, slot: PlayerSlot): BattleMove => canUse(state, slot, 'special') ? 'special' : 'strike';

test('seeded matches replay exactly, do not mutate input, and finish within the round limit', () => {
  const initial = createBattle(DEMO_FIGHTERS[0], DEMO_FIGHTERS[1], 12);
  const snapshot = JSON.stringify(initial);
  const cycle: BattleMove[] = ['strike', 'break', 'guard', 'strike'];
  const pick = (state: BattleState, slot: PlayerSlot) => cycle[(state.round + (slot === 'player1' ? 0 : 1)) % cycle.length];
  const result = play(initial, pick);
  assert.deepEqual(result, play(initial, pick));
  assert.equal(JSON.stringify(initial), snapshot);
  assert.ok(result.winnerId);
  assert.ok(result.round <= MAX_ROUNDS);
  assert.ok(result.player1Hp >= 0 && result.player2Hp >= 0);
  assert.equal(resolveRound(result, 'strike', 'strike'), result);
});

test('no move dominates: every move beats something and loses to something', () => {
  for (const mine of BATTLE_MOVES) {
    const edge = (theirs: CoreMove) => CLASH_TABLE[mine][theirs][0] - CLASH_TABLE[theirs][mine][0];
    assert.ok(BATTLE_MOVES.some(theirs => edge(theirs) > 0), `${mine} never wins an exchange`);
    assert.ok(BATTLE_MOVES.some(theirs => edge(theirs) < 0), `${mine} is never punished`);
  }
  // The core triangle.
  assert.equal(CLASH_TABLE.guard.strike[1], 'countered');
  assert.equal(CLASH_TABLE.break.guard[1], 'hit');
  assert.equal(CLASH_TABLE.strike.break[1], 'hit');
  assert.equal(CLASH_TABLE.guard.special[1], 'countered');
});

test('special costs energy, cannot be used when broke, and guarding builds energy', () => {
  let state = createBattle(DEMO_FIGHTERS[0], DEMO_FIGHTERS[1], 99);
  assert.equal(canUse(state, 'player1', 'special'), false);
  assert.equal(resolveRound(state, 'special', 'strike'), state);
  state = resolveRound(state, 'guard', 'strike');
  assert.equal(state.energy.player1, 2); // +1 per round, +1 for guarding
  assert.equal(state.energy.player2, 1);
  state = resolveRound(state, 'strike', 'strike');
  assert.equal(state.energy.player1, SPECIAL_COST);
  const afterSpecial = resolveRound(state, 'special', 'strike');
  assert.equal(afterSpecial.energy.player1, 1);
  assert.equal(afterSpecial.log.at(-1)!.damageTaken.player1, 0, 'special interrupts a strike');
  assert.ok(afterSpecial.log.at(-1)!.damageTaken.player2 > 0);
});

test('Break shatters Guard and drains energy; Guard counters Strike', () => {
  const initial = createBattle(DEMO_FIGHTERS[1], DEMO_FIGHTERS[1], 5);
  const broken = resolveRound({ ...initial, energy: { player1: 2, player2: 2 } }, 'break', 'guard');
  assert.ok(broken.log[0].damageTaken.player2 > 0);
  assert.equal(broken.log[0].damageTaken.player1, 0);
  assert.equal(broken.energy.player2, 1);
  const countered = resolveRound(initial, 'strike', 'guard');
  assert.equal(countered.log[0].damageTaken.player2, 0);
  assert.ok(countered.log[0].damageTaken.player1 > 0);
});

test('special spam is punished by a player who guards when the meter is full', () => {
  let specialsUsed = 0, spammerWins = 0;
  for (const p1 of DEMO_FIGHTERS) for (const p2 of DEMO_FIGHTERS) {
    const result = play(createBattle(p1, p2, 3), (state, slot) => slot === 'player1'
      ? specialSpam(state, slot)
      : state.energy.player1 >= SPECIAL_COST ? 'guard' : 'strike');
    const specials = result.log.filter(e => e.moves.player1 === 'special');
    specialsUsed += specials.length;
    if (result.winnerId === result.player1.id) spammerWins++;
    for (const e of specials) assert.ok(e.damageTaken.player1 > e.damageTaken.player2, 'guarded special must backfire');
  }
  assert.ok(specialsUsed > 0);
  assert.ok(spammerWins <= 3, `special spam won ${spammerWins}/9 pairings`);
});

test('no single hit exceeds the cap, guard spam cannot stall, and every demo pairing terminates', () => {
  for (const p1 of DEMO_FIGHTERS) for (const p2 of DEMO_FIGHTERS) {
    const result = play(createBattle(p1, p2), () => 'guard');
    assert.equal(result.status, 'finished');
    assert.equal(result.round, MAX_ROUNDS);
    assert.ok(result.winnerId);
    const brawl = play(createBattle(p1, p2, 8), specialSpam);
    for (const e of brawl.log) for (const slot of ['player1', 'player2'] as PlayerSlot[]) {
      assert.ok(e.damageTaken[slot] <= Math.ceil(brawl[slot].combat.maxHp * HIT_CAP));
    }
  }
  assert.ok(typeMultiplier('water', 'heat') > 1);
  assert.ok(typeMultiplier('heat', 'water') < 1);
  assert.equal(typeMultiplier('chaos', 'chaos'), 1);
});

/** Stat-neutral fighter so a trait's effect is measured in isolation. */
const neutral = (trait?: SignatureTrait, id: string = trait ?? 'none'): GameCharacter => ({
  ...DEMO_FIGHTERS[0], id: `neutral-${id}`, trait, type: { primary: 'chaos' }, combat: { class: 'balanced', hp: 75, maxHp: 75, attack: 70, defense: 70, speed: 60 },
});

test('no Signature Trait wins more than 58% (or less than 38%) at equal skill', () => {
  for (const trait of TRAIT_IDS) {
    const rand = seededRandom(3);
    let wins = 0, games = 0;
    for (const rival of TRAIT_IDS) {
      if (rival === trait) continue;
      for (let g = 0; g < 60; g++) {
        const a = playMatch(neutral(trait), neutral(rival), STRATEGIES.mixed, STRATEGIES.mixed, g, rand);
        const b = playMatch(neutral(rival), neutral(trait), STRATEGIES.mixed, STRATEGIES.mixed, g, rand);
        wins += Number(a.winnerId === a.player1.id) + Number(b.winnerId === b.player2.id);
        games += 2;
      }
    }
    const rate = wins / games;
    assert.ok(rate <= .58 && rate >= .38, `${trait} wins ${(rate * 100).toFixed(1)}%`);
  }
});

test('traits bend exactly their own rule', () => {
  // Pierce: Strike chips through Guard; without it a guarded Strike deals nothing.
  assert.ok(resolveRound(createBattle(neutral('pierce'), neutral()), 'strike', 'guard').log[0].damageTaken.player2 > 0);
  assert.equal(resolveRound(createBattle(neutral(), neutral(undefined, 'b')), 'strike', 'guard').log[0].damageTaken.player2, 0);
  // Charged starts with 2 energy; Shatter can Special at 2.
  assert.equal(createBattle(neutral('charged'), neutral()).energy.player1, 2);
  const shatter = { ...createBattle(neutral('shatter'), neutral()), energy: { player1: 2, player2: 2 } };
  assert.ok(canUse(shatter, 'player1', 'special'));
  assert.equal(canUse(shatter, 'player2', 'special'), false);
  // Crush drains 2 on a guard break (3 + 1 income - 3 = 1).
  const crushed = resolveRound({ ...createBattle(neutral('crush'), neutral()), energy: { player1: 3, player2: 3 } }, 'break', 'guard');
  assert.equal(crushed.energy.player2, 1);
  // Flow: Guard vs Guard gives +2 bonus instead of +1.
  assert.deepEqual(resolveRound(createBattle(neutral('flow'), neutral()), 'guard', 'guard').energy, { player1: 3, player2: 2 });
  // Scald: a Guard counter burns for the next 2 rounds.
  let scald = resolveRound(createBattle(neutral('scald'), neutral()), 'guard', 'strike');
  assert.equal(scald.effects.player2.burn, 2);
  const hpBefore = scald.player2Hp;
  scald = resolveRound(scald, 'guard', 'guard');
  assert.equal(hpBefore - scald.player2Hp, BURN_DAMAGE);
  // Deterministic trait picks are readable from the object.
  const props = { durability: 'medium', mobility: 'medium', weight: 'medium', sharpness: 'low', fragility: 'low', flexibility: 'low', electronic: false } as const;
  assert.equal(pickTrait('scissors office steel', { ...props, sharpness: 'very_high' }, 'fighter'), 'pierce');
  assert.equal(pickTrait('water bottle container', props, 'tank'), 'flow');
  assert.equal(pickTrait('laptop electronics', { ...props, electronic: true }, 'glass_cannon'), 'charged');
  assert.equal(pickTrait('dumbbell fitness iron', { ...props, weight: 'very_high' }, 'tank'), 'crush');
});

test('Call It: once per match, 1.5x on a correct read, +25% taken on a miss', () => {
  const start = createBattle(neutral(), neutral(undefined, 'b'), 21);
  const plain = resolveRound(start, 'guard', 'strike');
  const called = resolveRound(start, 'guard', 'strike', { player1: 'strike' });
  assert.ok(called.log[0].calls.player1?.correct);
  assert.ok(called.log[0].damageTaken.player2 > plain.log[0].damageTaken.player2);
  assert.equal(canCall(called, 'player1'), false);
  assert.equal(resolveRound(called, 'strike', 'strike', { player1: 'strike' }), called, 'second call is illegal');
  const missed = resolveRound(start, 'guard', 'strike', { player2: 'break' });
  assert.equal(missed.log[0].calls.player2?.correct, false);
  assert.ok(missed.log[0].damageTaken.player2 > plain.log[0].damageTaken.player2);
});

test('Snap Reinforcement: once per match, leaves you open, item applies after', () => {
  const start = createBattle(neutral(), neutral(undefined, 'b'), 4);
  const snapped = resolveRound(start, 'snap', 'strike');
  assert.ok(snapped.log[0].damageTaken.player1 > 0);
  assert.deepEqual(snapped.pendingSnaps, ['player1']);
  assert.equal(canUse(snapped, 'player1', 'snap'), false);
  const healed = applyReinforcement(snapped, 'player1', 'heal', 'banana');
  assert.ok(healed.player1Hp > snapped.player1Hp);
  assert.deepEqual(healed.pendingSnaps, []);
  assert.match(healed.notes[0].message, /banana/);
  const sprung = resolveRound(applyReinforcement(snapped, 'player1', 'trap'), 'guard', 'break');
  assert.ok(sprung.log.at(-1)!.damageTaken.player2 >= TRAP_DAMAGE);
  assert.equal(sprung.effects.player1.trap, false);
  const forfeited = applyReinforcement(snapped, 'player1', null);
  assert.equal(forfeited.player1Hp, snapped.player1Hp);
  assert.deepEqual(forfeited.pendingSnaps, []);
});

test('arena buffs its element by 10% and the pattern reader beats every fixed strategy', () => {
  const heat: GameCharacter = { ...neutral(), type: { primary: 'heat' } };
  const plain = resolveRound(createBattle(heat, neutral(undefined, 'b'), 9), 'strike', 'strike');
  const kitchen = resolveRound(createBattle(heat, neutral(undefined, 'b'), 9, { arena: 'kitchen' }), 'strike', 'strike');
  assert.ok(kitchen.log[0].damageTaken.player2 > plain.log[0].damageTaken.player2);
  const fighters = DEMO_FIGHTERS.map(f => ({ ...f, trait: undefined }));
  for (const fixed of ['strikeOnly', 'guardOnly', 'breakOnly', 'specialSpam']) {
    assert.ok(winRate(fighters, STRATEGIES.reader, STRATEGIES[fixed], 20) > .75, `reader vs ${fixed}`);
  }
});

test('Laya adapter sends typed questions and validates answers', async () => {
  const originalFetch = globalThis.fetch;
  let sent: Record<string, unknown> | undefined;
  try {
    globalThis.fetch = async (_url, options) => {
      sent = JSON.parse(String(options?.body));
      return Response.json({ answers: {
        combatClass: { choice: 'tank' }, primaryType: { choice: 'metal' },
        attackTier: { choice: 'medium' }, defenseTier: { choice: 'high' },
        healthTier: { choice: 'high' }, speedTier: { choice: 'low' },
      } });
    };
    const result = await new LayaDecisionEngine('http://localhost:8000').classify(object('Stapler'));
    assert.equal(result.decisionProvider, 'laya');
    assert.equal(result.combatClass, 'tank');
    assert.deepEqual(sent?.questions, LAYA_QUESTIONS);
    globalThis.fetch = async () => Response.json({ generated_text: 'I choose tank!' });
    await assert.rejects(() => new LayaDecisionEngine('http://localhost:8000').classify(object('Stapler')));
  } finally { globalThis.fetch = originalFetch; }
});

test('Laya timeout is hard bounded even when fetch never resolves; service falls back', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () => new Promise<Response>(() => {});
    const service = new DecisionEngineService(new LayaDecisionEngine('http://localhost:8000', '', 25));
    const started = Date.now();
    const decision = await service.classify(object('Water bottle'));
    assert.equal(decision.decisionProvider, 'fallback');
    assert.equal(decision.primaryType, 'water');
    assert.ok(Date.now() - started < 1000);
  } finally { globalThis.fetch = originalFetch; }
});

test('invalid Laya categories and HTTP errors fall back automatically', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const response of [Response.json({ answers: { combatClass: { choice: 'invincible' } } }), new Response('Unavailable', { status: 503 })]) {
      globalThis.fetch = async () => response;
      const decision = await new DecisionEngineService(new LayaDecisionEngine('http://localhost:8000')).classify(object('Plant'));
      assert.equal(decision.decisionProvider, 'fallback');
      assert.equal(decision.primaryType, 'nature');
    }
  } finally { globalThis.fetch = originalFetch; }
});
