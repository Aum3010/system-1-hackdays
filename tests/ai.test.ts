import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { analyzeWithProvider } from '../lib/ai/gemini';
import { MAX_IMAGE_BYTES, validateImageDataUrl } from '../lib/ai/imageInput';
import { AppError, readJsonBody } from '../lib/api/http';
import { gameCharacterSchema, objectAnalysisSchema, objectRejectionSchema, objectResultSchema } from '../lib/validation/schemas';
import { POST as analyzeRoute } from '../app/api/object-analysis/route';
import { POST as characterRoute } from '../app/api/character/route';
import { POST as decisionRoute } from '../app/api/decision/route';

const analysis = {
  objectName: 'Stapler', category: 'office_supply', confidence: 0.96, materials: ['metal', 'plastic'],
  properties: {durability: 'high', mobility: 'low', weight: 'medium', sharpness: 'medium', fragility: 'low', flexibility: 'low', electronic: false},
  creative: {suggestedCharacterName: 'Staplord', suggestedDescription: 'A menace powered by paperwork.', suggestedSpecialAbility: 'Paper Pierce'},
};
const image = {mimeType: 'image/png' as const, data: 'aGVsbG8='};
const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLe8AAAAASUVORK5CYII=';
const post = (body: unknown) => new Request('http://localhost/api', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});

test('canonical perception schema can be sent as Gemini JSON Schema', () => {
  const schema = z.toJSONSchema(objectResultSchema);
  assert.ok(schema.anyOf);
  assert.equal(schema.anyOf.length, 2);
});

test('Gemini structured response validates and retries invalid JSON exactly once', async () => {
  let calls = 0;
  const result = await analyzeWithProvider(image, async (_image, retry) => {calls++; assert.equal(retry, calls === 2); return calls === 1 ? 'not JSON' : JSON.stringify(analysis);});
  assert.equal(calls, 2);
  assert.equal(objectAnalysisSchema.parse(result).objectName, 'Stapler');
});

test('Gemini invalid schema after two attempts gives a friendly 503', async () => {
  let calls = 0;
  await assert.rejects(analyzeWithProvider(image, async () => {calls++; return '{"objectName":"Unknown"}';}), (error: unknown) => error instanceof AppError && error.status === 503);
  assert.equal(calls, 2);
});

test('Gemini rejection is returned without retry or fabricated object', async () => {
  let calls = 0;
  const result = await analyzeWithProvider(image, async () => {calls++; return JSON.stringify({rejected: true, rejectionReason: 'Please photograph an object instead of a face.'});});
  assert.equal(objectRejectionSchema.parse(result).rejected, true);
  assert.equal(calls, 1);
});

test('low-confidence recognition is politely rejected', async () => {
  const result = await analyzeWithProvider(image, async () => JSON.stringify({...analysis, confidence: 0.2}));
  assert.equal(result.rejected, true);
});

test('hung Gemini provider is aborted and bounded to two attempts', async () => {
  let aborted = 0;
  await assert.rejects(analyzeWithProvider(image, async (_image, _retry, signal) => new Promise(() => {signal.addEventListener('abort', () => {aborted++;});}), 5), AppError);
  assert.equal(aborted, 2);
});

test('image validation accepts PNG and rejects forged, malformed, unsupported, and oversized data', () => {
  assert.equal(validateImageDataUrl(tinyPng).mimeType, 'image/png');
  assert.throws(() => validateImageDataUrl(tinyPng.replace('image/png', 'image/jpeg')), AppError);
  assert.throws(() => validateImageDataUrl('data:image/png;base64,aGVsbG8='), AppError);
  assert.throws(() => validateImageDataUrl('data:image/svg+xml;base64,PHN2Zz4='), AppError);
  assert.throws(() => validateImageDataUrl('data:image/png;base64,' + Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64')), (error: unknown) => error instanceof AppError && error.status === 413);
});

test('body reader caps streaming body without Content-Length and rejects malformed JSON', async () => {
  const headers = {'Content-Type': 'application/json'};
  await assert.rejects(readJsonBody(new Request('http://localhost/api', {method: 'POST', headers, body: JSON.stringify({text: 'x'.repeat(200)})}), 100), (error: unknown) => error instanceof AppError && error.status === 413);
  await assert.rejects(readJsonBody(new Request('http://localhost/api', {method: 'POST', headers, body: '{'})), AppError);
  assert.deepEqual(await readJsonBody(new Request('http://localhost/api', {method: 'POST', headers, body: '{"ok":true}'})), {ok: true});
});

test('object-analysis API validates uploads before a friendly missing-key response', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const invalid = await analyzeRoute(post({image: 'not an image'}));
    assert.equal(invalid.status, 400);
    const result = await analyzeRoute(post({image: tinyPng}));
    assert.equal(result.status, 503);
    assert.equal((await result.json()).code, 'GEMINI_NOT_CONFIGURED');
  } finally {if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;}
});

test('decision and character routes produce validated fallback fighters without Laya', async () => {
  const previousEndpoint = process.env.LAYA_ENDPOINT;
  delete process.env.LAYA_ENDPOINT;
  try {
    const decisionResponse = await decisionRoute(post({analysis}));
    assert.equal(decisionResponse.status, 200);
    assert.equal((await decisionResponse.json()).decision.decisionProvider, 'fallback');
    const response = await characterRoute(post({analysis, sourceImage: tinyPng}));
    assert.equal(response.status, 200);
    const character = gameCharacterSchema.parse((await response.json()).character);
    assert.equal(character.identity.name, 'Staplord');
    assert.equal(character.metadata.decisionProvider, 'fallback');
    const rejected = await characterRoute(post({analysis: {...analysis, confidence: 0.1}, sourceImage: tinyPng}));
    assert.equal(rejected.status, 422);
  } finally {if (previousEndpoint === undefined) delete process.env.LAYA_ENDPOINT; else process.env.LAYA_ENDPOINT = previousEndpoint;}
});
