import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_FIGHTERS } from '../lib/game/demo';
import { applyHuntBonus, countersFor, huntHint } from '../lib/game/counterHunt';
import { gameCharacterSchema } from '../lib/validation/schemas';

test('Counter-Hunt: type counter + speed earn bounded bonuses; late photos earn nothing', () => {
  const [staplord, hydronox, byteforge] = DEMO_FIGHTERS;
  assert.deepEqual(countersFor('water'), ['electric']);
  assert.deepEqual(countersFor('metal'), []);
  assert.match(huntHint('metal'), /no weakness/);
  // Byteforge (electric) counters Hydronox (water).
  const fast = applyHuntBonus(hydronox, byteforge, 6);
  assert.equal(fast.fighter.combat.attack, Math.min(100, byteforge.combat.attack + 8));
  assert.equal(fast.fighter.combat.speed, Math.min(100, byteforge.combat.speed + 9));
  assert.match(fast.fighter.badges![0], /Counter-Hunter/);
  assert.ok(gameCharacterSchema.safeParse(fast.fighter).success);
  // No counter against metal: speed only.
  const speedOnly = applyHuntBonus(staplord, hydronox, 30);
  assert.equal(speedOnly.fighter.combat.attack, hydronox.combat.attack);
  assert.equal(speedOnly.fighter.combat.speed, hydronox.combat.speed + 5);
  // Too slow.
  const late = applyHuntBonus(hydronox, byteforge, 61);
  assert.equal(late.fighter, byteforge);
  assert.equal(late.summary, null);
});
