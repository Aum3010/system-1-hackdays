import assert from 'node:assert/strict';
import test from 'node:test';
import type { ObjectAnalysis } from '../types/object';
import type { BattleState, CoreMove, PlayerSlot } from '../types/battle';
import { LayaProfileEngine, LAYA_PROFILE_QUESTIONS, statNudge } from '../lib/decision/LayaProfileEngine';
import { DecisionEngineService } from '../lib/decision/DecisionEngineService';
import { FallbackDecisionEngine } from '../lib/decision/FallbackDecisionEngine';
import { generateStats } from '../lib/game/statEngine';
import { createCharacter } from '../lib/game/characterEngine';
import { refereeArena, refereeReinforcement } from '../lib/decision/layaScenes';
import { collectText, layaSafetyFlag } from '../lib/ai/layaSafety';
import { generateStructured } from '../lib/ai/structured';
import { botMove, cleanPrediction, describeForLaya, expectedValues, summarizeForBot, type MovePrediction } from '../lib/game/bot';
import { createBattle, resolveRound } from '../lib/game/battleEngine';
import { STRATEGIES, playMatch, seededRandom, type Strategy } from '../lib/game/simulate';
import { DEMO_FIGHTERS } from '../lib/game/demo';
import { gameCharacterSchema } from '../lib/validation/schemas';
import { z } from 'zod';
import { POST as botRoute } from '../app/api/bot-move/route';

function object(name: string, materials: string[] = ['plastic'], electronic = false): ObjectAnalysis {
  return {
    objectName: name, category: 'everyday_object', materials, confidence: .96,
    properties: { durability: 'high', mobility: 'low', weight: 'medium', sharpness: 'low', fragility: 'low', flexibility: 'low', electronic },
    creative: { suggestedCharacterName: `${name} fighter`, suggestedDescription: 'A worthy contender.', suggestedSpecialAbility: 'Impact wave' },
  };
}
const choice = (pick: string, confidence: number) => ({ choice: pick, probabilities: { [pick]: confidence }, answer_confidence: confidence });
const score = (value: number) => ({ score: value, answer_confidence: .5 });

async function withFetch<T>(handler: (url: string, body: Record<string, unknown>) => unknown, run: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, options?: RequestInit) => {
    const result = handler(String(url), JSON.parse(String(options?.body ?? '{}')));
    return result instanceof Response ? result : Response.json(result);
  }) as typeof fetch;
  try { return await run(); } finally { globalThis.fetch = originalFetch; }
}
async function withEndpoint<T>(run: () => Promise<T>): Promise<T> {
  const previous = process.env.LAYA_ENDPOINT;
  process.env.LAYA_ENDPOINT = 'http://127.0.0.1:8000';
  try { return await run(); } finally { if (previous === undefined) delete process.env.LAYA_ENDPOINT; else process.env.LAYA_ENDPOINT = previous; }
}

test('profile engine: confident Laya element is used, class/tiers stay rule-based, stats get bounded nudges', async () => {
  const analysis = object('Water bottle', ['steel']);
  let sent: Record<string, unknown> | undefined;
  const decision = await withFetch((_url, body) => { sent = body; return { answers: { primaryType: choice('water', .69), attack: score(3.9), defense: score(.2), health: score(1.9), speed: score(2.4) } }; },
    () => new LayaProfileEngine('http://localhost:8000').classify(analysis));
  const baseline = await new FallbackDecisionEngine().classify(analysis);
  assert.deepEqual(sent?.questions, LAYA_PROFILE_QUESTIONS);
  assert.equal(decision.decisionProvider, 'laya');
  assert.equal(decision.primaryType, 'water');
  assert.equal(decision.combatClass, baseline.combatClass);
  assert.equal(decision.attackTier, baseline.attackTier);
  assert.deepEqual(decision.layaRead?.statNudge, { attack: 8, defense: -8, health: 0, speed: 3 });
  const plain = generateStats(analysis, baseline), nudged = generateStats(analysis, decision);
  // Defense is already past the 100 cap for this tank, so its -8 is absorbed by the clamp.
  assert.deepEqual([nudged.attack - plain.attack, nudged.speed - plain.speed, nudged.maxHp - plain.maxHp], [8, 3, 0]);
  assert.ok(nudged.defense <= plain.defense);
  assert.ok(Object.values(nudged).every(v => typeof v === 'string' || (v >= 20 && v <= 100)));
  const character = gameCharacterSchema.parse(createCharacter(analysis, decision, 'data:image/jpeg;base64,AAAA'));
  assert.equal(character.layaRead?.primaryType?.used, true);
});

test('profile engine: electronic objects and low confidence keep the rule-based element', async () => {
  const answers = (type: string, confidence: number) => ({ answers: { primaryType: choice(type, confidence), attack: score(2), defense: score(2), health: score(2), speed: score(2) } });
  const laptop = await withFetch(() => answers('metal', .95), () => new LayaProfileEngine('http://localhost:8000').classify(object('Laptop', ['aluminum'], true)));
  assert.equal(laptop.primaryType, 'electric');
  assert.equal(laptop.layaRead?.primaryType?.used, false);
  const unsure = await withFetch(() => answers('metal', .4), () => new LayaProfileEngine('http://localhost:8000').classify(object('Plant', ['plant'])));
  assert.equal(unsure.primaryType, 'nature');
  assert.equal(statNudge(100), 8);
  assert.equal(statNudge(-100), -8);
});

test('profile engine: malformed answers make the service fall back', async () => {
  const decision = await withFetch(() => ({ answers: { primaryType: choice('lava', .9) } }),
    () => new DecisionEngineService(new LayaProfileEngine('http://localhost:8000')).classify(object('Plant', ['plant'])));
  assert.equal(decision.decisionProvider, 'fallback');
  assert.equal(decision.layaRead, undefined);
});

test('referee: Laya decides when confident, otherwise (or when off) Gemini keeps its pick', async () => {
  assert.deepEqual(await refereeReinforcement('hardcover book', 'heal'), { choice: 'heal', decidedBy: 'gemini' });
  await withEndpoint(async () => {
    const sure = await withFetch(() => ({ answers: { item: choice('shield', .92) } }), () => refereeReinforcement('hardcover book', 'heal'));
    assert.deepEqual(sure, { choice: 'shield', decidedBy: 'laya', confidence: .92 });
    const unsure = await withFetch(() => ({ answers: { arena: choice('street', .3) } }), () => refereeArena('a blurry room', 'desk'));
    assert.deepEqual(unsure, { choice: 'desk', decidedBy: 'gemini' });
    const down = await withFetch(() => new Response('down', { status: 503 }), () => refereeArena('a park', 'outdoors'));
    assert.equal(down.decidedBy, 'gemini');
  });
});

test('Laya safety: lines are checked one by one, flagged per threshold, and it fails open', async () => {
  assert.deepEqual(collectText({ a: '{self} hits {opponent}', b: ['x', { c: 'y' }] }), ['the fighter hits the fighter', 'x', 'y']);
  assert.equal(await layaSafetyFlag('anything'), null, 'no-op without an endpoint');
  await withEndpoint(async () => {
    const clean = { person: { noul: .1 }, violence: { noul: .27 }, politics: { noul: .03 } };
    const seen: string[] = [];
    assert.equal(await withFetch((_url, body) => { seen.push((body.state as { text: string }).text); return { answers: clean }; }, () => layaSafetyFlag({ a: 'A stapler with ambition.', b: ['Line two.', 'Line two.'] })), null);
    assert.deepEqual(seen.sort(), ['A stapler with ambition.', 'Line two.'], 'one request per distinct line');
    const flagged = await withFetch((_url, body) => ({ answers: String((body.state as { text: string }).text).includes('party') ? { ...clean, politics: { noul: .77 } } : clean }),
      () => layaSafetyFlag(['Fine line.', 'votes for the party', 'Another fine line.']));
    assert.equal(flagged, 'politics');
    assert.equal(await withFetch(() => new Response('down', { status: 500 }), () => layaSafetyFlag('text')), null);
  });
});

test('structured calls use the canned fallback when the second safety layer flags valid output', async () => {
  const schema = z.object({ line: z.string() });
  const result = await generateStructured({ label: 't', schema, system: '', prompt: '', timeoutMs: 1000, fallback: () => ({ line: 'canned' }),
    transport: async () => JSON.stringify({ line: 'looks fine to the regex' }), safetyCheck: async () => 'person' });
  assert.deepEqual(result, { data: { line: 'canned' }, source: 'fallback', reason: 'unsafe' });
});

test('bot: prediction cleanup, expected values and legal picks', () => {
  const p = cleanPrediction({ strike: .1, guard: .1, break: .1, special: .7 }, false);
  assert.equal(p.special, 0);
  assert.ok(Math.abs(p.strike + p.guard + p.break - 1) < 1e-9);
  const ev = expectedValues(cleanPrediction({ guard: 1 }, false));
  assert.equal((Object.entries(ev) as [CoreMove, number][]).sort((a, b) => b[1] - a[1])[0][0], 'break');
  const [a, b] = DEMO_FIGHTERS;
  const fresh = createBattle(a, b, 1);
  for (let i = 0; i < 50; i++) assert.notEqual(botMove(fresh, 'player2', { special: 1 }, Math.random), 'special', 'bot cannot afford a special at 0 energy');
  const rand = seededRandom(3);
  const picks = Array.from({ length: 200 }, () => botMove(fresh, 'player2', { strike: 1 }, rand));
  assert.ok(picks.filter(m => m === 'guard').length > 120, 'strongly predicted Strike is mostly answered with Guard');
  assert.ok(new Set(picks).size > 1, 'still a mixed strategy');
});

test('bot: summary and Laya wording come from the log only', () => {
  const [a, b] = DEMO_FIGHTERS;
  let state = createBattle(a, b, 5);
  state = resolveRound(state, 'guard', 'strike');
  state = resolveRound(state, 'guard', 'strike');
  const summary = summarizeForBot(state, 'player2');
  assert.deepEqual(summary.opponentMoves, ['guard', 'guard']);
  assert.match(describeForLaya(summary), /oldest first: guard, guard\. A has \d energy/);
});

test('bot counter-logic beats every fixed strategy given a pattern predictor (Laya stand-in)', () => {
  // Frequency of the human's last 4 moves: what Laya's prediction approximates for repeated habits.
  const predictor = (s: BattleState, me: PlayerSlot): MovePrediction => {
    const human: PlayerSlot = me === 'player1' ? 'player2' : 'player1';
    const recent = s.log.slice(-4).map(e => e.moves[human]);
    const counts: MovePrediction = { strike: 1, guard: 1, break: 1, special: 1 };
    for (const m of recent) if (m in counts) counts[m as CoreMove] += 3;
    return counts;
  };
  const bot: Strategy = (s, me, r) => botMove(s, me, predictor(s, me), r);
  const [a, b, c] = DEMO_FIGHTERS;
  for (const fixed of ['strikeOnly', 'guardOnly', 'breakOnly', 'specialSpam']) {
    let wins = 0, games = 0;
    const rand = seededRandom(11);
    for (const [f1, f2] of [[a, b], [b, c], [c, a]]) for (let g = 0; g < 30; g++) {
      const match = playMatch(f1, f2, STRATEGIES[fixed], bot, g, rand);
      if (match.winnerId === match.player2.id) wins++;
      games++;
    }
    assert.ok(wins / games > .75, `bot vs ${fixed}: ${wins}/${games}`);
  }
});

test('bot-move route answers 503 without Laya so the client plays the built-in bot', async () => {
  const previous = process.env.LAYA_ENDPOINT;
  delete process.env.LAYA_ENDPOINT;
  try {
    const body = { opponentMoves: ['strike'], opponentEnergy: 1, opponentSpecialReady: false, botEnergy: 1, round: 1 };
    const response = await botRoute(new Request('http://localhost/api/bot-move', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    assert.equal(response.status, 503);
    const bad = await botRoute(new Request('http://localhost/api/bot-move', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, opponentMoves: ['teleport'] }) }));
    assert.equal(bad.status, 400);
  } finally { if (previous !== undefined) process.env.LAYA_ENDPOINT = previous; }
});
