// Balance report: `npx tsx scripts/simulate.ts`. Pure simulation, no network.
import { DEMO_FIGHTERS } from '../lib/game/demo';
import { STRATEGIES, winRate, playMatch, seededRandom } from '../lib/game/simulate';
import { TRAIT_IDS } from '../lib/game/traits';
import type { GameCharacter, SignatureTrait } from '../types/game';

const names = Object.keys(STRATEGIES);
const base = DEMO_FIGHTERS.map(f => ({ ...f, trait: undefined }));
console.log('Strategy win% (row vs column), demo fighters without traits:');
console.log(''.padEnd(12) + names.map(n => n.padStart(12)).join(''));
for (const a of names) console.log(a.padEnd(12) + names.map(b => `${Math.round(100 * winRate(base, STRATEGIES[a], STRATEGIES[b], 60))}%`.padStart(12)).join(''));

/** A stat-neutral fighter so trait strength is measured in isolation. */
export function neutral(trait?: SignatureTrait): GameCharacter {
  return { ...DEMO_FIGHTERS[0], id: `neutral-${trait ?? 'none'}`, trait, type: { primary: 'chaos' }, combat: { class: 'balanced', hp: 75, maxHp: 75, attack: 70, defense: 70, speed: 60 } };
}
for (const strat of ['mixed', 'reader'] as const) {
  console.log(`\nTrait win% vs every other trait (equal stats, both players '${strat}'):`);
  for (const t of TRAIT_IDS) {
    const rand = seededRandom(3);
    let wins = 0, games = 0;
    for (const o of TRAIT_IDS) {
      if (o === t) continue;
      for (let g = 0; g < 300; g++) {
        const s1 = playMatch(neutral(t), neutral(o), STRATEGIES[strat], STRATEGIES[strat], g, rand);
        const s2 = playMatch(neutral(o), neutral(t), STRATEGIES[strat], STRATEGIES[strat], g, rand);
        wins += Number(s1.winnerId === s1.player1.id) + Number(s2.winnerId === s2.player2.id); games += 2;
      }
    }
    console.log(`  ${t.padEnd(9)} ${(100 * wins / games).toFixed(1)}%`);
  }
}
