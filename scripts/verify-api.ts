import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { objectAnalysisSchema, gameCharacterSchema, characterDecisionSchema } from '../lib/validation/schemas';

const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const fixture = objectAnalysisSchema.parse({
  objectName: 'Water bottle', category: 'container', confidence: .96, materials: ['metal', 'plastic'],
  properties: {durability:'high',mobility:'low',weight:'medium',sharpness:'very_low',fragility:'low',flexibility:'low',electronic:false},
  creative: {suggestedCharacterName:'HYDRONOX',suggestedDescription:'A well-hydrated challenger.',suggestedSpecialAbility:'Hydro Slam'},
});
async function post(path: string, body: unknown) {
  const response = await fetch(`${origin}${path}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  return {status:response.status, body:await response.json()};
}
async function main() {
  assert.equal((await fetch(origin)).status, 200);
  const image = `data:image/jpeg;base64,${(await readFile(resolve('public/fighters/bottle.jpg'))).toString('base64')}`;
  const decision = await post('/api/decision', {analysis:fixture});
  assert.equal(decision.status, 200);
  characterDecisionSchema.parse(decision.body.decision);
  const result = await post('/api/character', {analysis:fixture,sourceImage:image});
  assert.equal(result.status, 200);
  const fighter = gameCharacterSchema.parse(result.body.character);
  assert.equal(fighter.object.name, 'Water bottle');
  assert.ok(fighter.combat.maxHp >= 20 && fighter.combat.maxHp <= 100);
  for (const [path, body] of [
    ['/api/object-analysis',{image:'not-an-image'}],
    ['/api/object-analysis',{image:'data:image/jpeg;base64,bm90YW5pbWFnZQ=='}],
    ['/api/character',{analysis:{rejected:true,rejectionReason:'No clear object'},sourceImage:image}],
    ['/api/decision',{analysis:{}}],
  ] as const) {
    const invalid = await post(path, body);
    assert.ok(invalid.status >= 400 && invalid.status < 500, `${path} should reject invalid input`);
    assert.ok(invalid.body.error || invalid.body.rejectionReason);
  }
  const malformed = await fetch(`${origin}/api/object-analysis`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad json'});
  assert.equal(malformed.status,400);
  console.log('HTTP integration passed: page, decision, character, invalid uploads, rejected analysis, malformed JSON.');
  console.log('This check uses an explicit analysis fixture; it does not claim live Gemini recognition.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
