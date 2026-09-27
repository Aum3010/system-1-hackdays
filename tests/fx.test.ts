import assert from 'node:assert/strict';
import test from 'node:test';
import { createBattle, resolveRound } from '../lib/game/battleEngine';
import { DEMO_FIGHTERS } from '../lib/game/demo';
import { clashCallout, deriveTimeline, instantTimeline, pickLine, type FxEvent } from '../lib/fx/timeline';
import type { BattleState } from '../types/battle';

const types = (steps: { event: FxEvent }[]) => steps.map(s => s.event.type);

test('timeline orders countdown -> reveal -> callout -> hits -> hp -> energy -> done', () => {
  const prev = createBattle(DEMO_FIGHTERS[0], DEMO_FIGHTERS[1], 5);
  const next = resolveRound(prev, 'guard', 'strike');
  const steps = deriveTimeline(prev, next);
  const order = types(steps);
  assert.deepEqual(order.slice(0, 5), ['countdown', 'countdown', 'countdown', 'reveal', 'callout']);
  assert.equal(order.at(-1), 'done');
  const index = (t: FxEvent['type']) => order.indexOf(t);
  assert.ok(index('hitstop') > index('callout'), 'counter-hits freeze after the callout');
  assert.ok(index('hit') > index('hitstop') && index('hp') > index('hit') && index('energy') > index('hp'));
  // Timestamps never go backwards.
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i].at >= steps[i - 1].at);
  const callout = steps.find(s => s.event.type === 'callout')!.event;
  assert.deepEqual(callout, { type: 'callout', text: 'COUNTERED!', tone: 'counter' });
  // The hp step carries exact before/after values from the engine, untouched.
  const hp = steps.find(s => s.event.type === 'hp')!.event;
  assert.deepEqual(hp, { type: 'hp', target: 'player2', from: prev.player2Hp, to: next.player2Hp });
});

test('callouts cover every outcome and a no-new-round input yields only done', () => {
  const base = createBattle(DEMO_FIGHTERS[0], DEMO_FIGHTERS[1], 5);
  const rich: BattleState = { ...base, energy: { player1: 3, player2: 3 } };
  const text = (m1: Parameters<typeof resolveRound>[1], m2: Parameters<typeof resolveRound>[2]) => clashCallout(resolveRound(rich, m1, m2).log[0]).text;
  assert.equal(text('guard', 'guard'), 'BOTH GUARD');
  assert.equal(text('strike', 'strike'), 'MIRROR CLASH');
  assert.equal(text('break', 'guard'), 'GUARD BROKEN!');
  assert.equal(text('special', 'strike'), 'SPECIAL!');
  assert.equal(text('special', 'special'), 'SPECIAL CLASH!');
  assert.equal(text('strike', 'break'), 'INTERRUPTED!');
  assert.equal(text('snap', 'strike'), 'SNAP!');
  assert.deepEqual(types(deriveTimeline(base, base)), ['done']);
});

test('Called It, KO and slow-mo: final blow is stretched and ends with ko', () => {
  const prev = { ...createBattle(DEMO_FIGHTERS[0], DEMO_FIGHTERS[2], 5), player2Hp: 3 };
  const next = resolveRound(prev, 'strike', 'break', { player1: 'break' });
  assert.equal(next.status, 'finished');
  const normal = deriveTimeline(prev, next);
  const slow = deriveTimeline(prev, next, { slowMo: true });
  assert.ok(slow.at(-1)!.at > normal.at(-1)!.at);
  const order = types(slow);
  assert.ok(order.includes('ko'));
  assert.ok(slow.some(s => s.event.type === 'callout' && s.event.text === 'CALLED IT!'));
  const line = pickLine(prev, next.log[0], next);
  assert.deepEqual(line, { slot: 'player1', event: 'knockout' });
});

test('instant timeline keeps text but drops countdown and hit-stop, all at t=0', () => {
  const prev = createBattle(DEMO_FIGHTERS[0], DEMO_FIGHTERS[1], 5);
  const next = resolveRound(prev, 'guard', 'strike');
  const steps = instantTimeline(prev, next);
  assert.ok(steps.every(s => s.at === 0));
  assert.ok(!types(steps).includes('countdown') && !types(steps).includes('hitstop'));
  assert.ok(types(steps).includes('callout') && types(steps).at(-1) === 'done');
});
