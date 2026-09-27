import assert from 'node:assert/strict';
import test from 'node:test';
import type { ObjectAnalysis } from '../types/object';
import { generateLore } from '../lib/ai/lore';
import { fallbackLore } from '../lib/ai/fallbackLore';
import { findUnsafe } from '../lib/ai/safety';
import { loreSchema } from '../lib/validation/lore';
import type { Transport } from '../lib/ai/structured';
import { announcerLine, fillPlaceholders } from '../lib/fx/announcer';
import { announcerMoment, announceFor } from '../lib/fx/timeline';
import { pickJargon, JARGON_IDS } from '../lib/game/jargon';
import { createBattle, resolveRound } from '../lib/game/battleEngine';
import { DEMO_FIGHTERS } from '../lib/game/demo';

const analysis: ObjectAnalysis = {
  objectName: 'Water bottle', category: 'container', confidence: .95, materials: ['stainless steel', 'silicone'],
  properties: { durability: 'high', mobility: 'medium', weight: 'medium', sharpness: 'very_low', fragility: 'low', flexibility: 'very_low', electronic: false },
  creative: { suggestedCharacterName: 'Hydronox', suggestedDescription: 'Hydrated.', suggestedSpecialAbility: 'Hydro Slam' },
};
const valid = () => JSON.stringify(fallbackLore({ objectName: 'Gemini bottle', materials: ['steel'], electronic: false, jargon: 'CIRCLE_BACK' }));

test('lore: valid Gemini JSON is used; jargon rule is decided in code, not by the model', async () => {
  let calls = 0;
  const transport: Transport = async () => { calls++; return valid(); };
  const result = await generateLore({ analysis, spice: 'unhinged' }, transport);
  assert.equal(result.source, 'gemini');
  assert.equal(calls, 1);
  assert.match(result.lore.corporateTitle, /Gemini Bottle/);
  assert.equal(result.jargon, 'CIRCLE_BACK'); // bottle -> Flow trait -> CIRCLE_BACK
});

test('lore: invalid JSON retries exactly once, then falls back', async () => {
  let calls = 0;
  const once: Transport = async ({ retry }) => { calls++; return retry ? valid() : '{"corporateTitle":'; };
  assert.equal((await generateLore({ analysis, spice: 'mild' }, once)).source, 'gemini');
  assert.equal(calls, 2);
  calls = 0;
  const never: Transport = async () => { calls++; return JSON.stringify({ corporateTitle: 'only this' }); };
  const result = await generateLore({ analysis, spice: 'mild' }, never);
  assert.equal(calls, 2);
  assert.equal(result.source, 'fallback');
  assert.ok(loreSchema.safeParse(result.lore).success);
});

test('lore: timeout and unsafe text fall back; missing key never calls Gemini', async () => {
  const slow: Transport = ({ signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const started = Date.now();
  const timedOut = await generateLore({ analysis, spice: 'spicy' }, slow);
  assert.equal(timedOut.source, 'fallback');
  assert.ok(Date.now() - started < 9000);
  let unsafeCalls = 0;
  const unsafe: Transport = async () => { unsafeCalls++; const lore = JSON.parse(valid()); lore.trashTalk[0] = 'You got fired, loser.'; return JSON.stringify(lore); };
  const blocked = await generateLore({ analysis, spice: 'unhinged' }, unsafe);
  assert.equal(blocked.source, 'fallback');
  assert.equal(unsafeCalls, 1, 'unsafe output is not retried');
  assert.equal((await generateLore({ analysis, spice: 'unhinged' }, null)).source, 'fallback');
});

test('lore: over-long strings are truncated on the server, not rejected', () => {
  const lore = JSON.parse(valid());
  lore.corporateTitle = 'x'.repeat(200);
  const parsed = loreSchema.parse(lore);
  assert.equal(parsed.corporateTitle.length, 70);
  assert.ok(parsed.corporateTitle.endsWith('…'));
  assert.equal(findUnsafe(fallbackLore({ objectName: 'mug', materials: ['ceramic'], electronic: false, jargon: 'ON_MUTE' })), null);
});

test('announcer: placeholders filled, unknown ones stripped, seeded pick is deterministic', () => {
  assert.equal(fillPlaceholders('{self} hits {opponent} with {move}{evil}', { self: 'A', opponent: 'B', move: 'Break' }), 'A hits B with Break');
  const bank = fallbackLore({ objectName: 'mug', materials: ['ceramic'], electronic: false, jargon: 'ON_MUTE' }).announcerBank;
  const a = announcerLine(bank, 'counter', { self: 'A', opponent: 'B', move: 'Guard' }, 42);
  assert.equal(a, announcerLine(bank, 'counter', { self: 'A', opponent: 'B', move: 'Guard' }, 42));
  assert.ok(!a.includes('{'));
  const prev = createBattle(DEMO_FIGHTERS[0], DEMO_FIGHTERS[1], 5);
  const next = resolveRound(prev, 'guard', 'strike');
  assert.deepEqual(announcerMoment(prev, next.log[0], next), { event: 'counter', owner: 'player1' });
  assert.match(announceFor(prev, next.log[0], next)!, /STAPLORD/);
  for (const id of JARGON_IDS) assert.ok(typeof id === 'string');
  assert.equal(pickJargon('pierce'), pickJargon('pierce'));
});
