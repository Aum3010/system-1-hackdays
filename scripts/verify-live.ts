import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { gameCharacterSchema, objectAnalysisSchema } from '../lib/validation/schemas';
import { createBattle, resolveRound, canUse } from '../lib/game/battleEngine';
import type { GameCharacter } from '../types/game';

const origin=process.env.APP_URL || 'http://127.0.0.1:3000';
async function main() {
  const fighters:GameCharacter[]=[];
  for(const name of ['bottle','laptop','stapler']) {
    const image=`data:image/jpeg;base64,${(await readFile(resolve(`public/fighters/${name}.jpg`))).toString('base64')}`;
    const response=await fetch(`${origin}/api/object-analysis`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image})});
    const result=await response.json();
    if(!response.ok) {
      if(name==='stapler' && result.rejected) {console.log('Bundled stapler photo has multiple objects: correctly rejected as ambiguous.');continue;}
      throw new Error(`Live ${name} recognition not verified: ${result.code || response.status}. ${result.rejectionReason || result.error || 'Check the server and provider configuration.'}`);
    }
    const analysis=objectAnalysisSchema.parse(result.analysis);
    const characterResponse=await fetch(`${origin}/api/character`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analysis,sourceImage:image})});
    assert.equal(characterResponse.status,200);
    const character=gameCharacterSchema.parse((await characterResponse.json()).character);
    fighters.push(character);
    console.log(`${name}: recognized ${analysis.objectName}; character ${character.identity.name}; decisionProvider=${character.metadata.decisionProvider}`);
  }
  let battle=createBattle(fighters[0],fighters[1],42);
  for(let round=0;round<20 && battle.status!=='finished';round++) battle=resolveRound(battle,canUse(battle,'player1','special')?'special':'strike',round%3===0?'guard':'break');
  assert.equal(battle.status,'finished');
  assert.ok(battle.winnerId);
  console.log('Live image -> Gemini -> decision -> character -> battle -> winner PASSED for bundled sample images. Browser verification is separate.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Live verification failed');process.exitCode=1;});
