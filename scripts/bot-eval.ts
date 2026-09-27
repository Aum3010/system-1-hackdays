import type { BattleState, PlayerSlot } from '../types/battle';
import { DEMO_FIGHTERS } from '../lib/game/demo';
import { createBattle, resolveRound } from '../lib/game/battleEngine';
import { STRATEGIES, seededRandom, type Strategy } from '../lib/game/simulate';
import { botMove, summarizeForBot } from '../lib/game/bot';
import { predictHumanMove } from '../lib/decision/layaBot';

/**
 * Solo-mode evaluation against a LIVE Laya server: the Laya bot (player 2) vs scripted players,
 * next to the built-in `reader` bot on the same seeds. Usage: LAYA_ENDPOINT=http://127.0.0.1:8000 npx tsx scripts/bot-eval.ts [games]
 */
const games = Number(process.argv[2] || 8);
if (!process.env.LAYA_ENDPOINT) process.env.LAYA_ENDPOINT = 'http://127.0.0.1:8000';
type AsyncStrategy = (s: BattleState, me: PlayerSlot, r: () => number) => Promise<ReturnType<Strategy>>;
const layaBot: AsyncStrategy = async (s, me, r) => botMove(s, me, await predictHumanMove(summarizeForBot(s, me), 15000), r);
const readerBot: AsyncStrategy = async (s, me, r) => STRATEGIES.reader(s, me, r);

async function play(opponent: Strategy, bot: AsyncStrategy, seed: number) {
  const [a, b, c] = DEMO_FIGHTERS;
  const pairs = [[a, b], [b, c], [c, a]];
  const [f1, f2] = pairs[seed % pairs.length];
  const rand = seededRandom(seed + 1);
  let state = createBattle(f1, f2, seed);
  while (state.status !== 'finished') state = resolveRound(state, opponent(state, 'player1', rand), await bot(state, 'player2', rand));
  return state.winnerId === state.player2.id;
}

(async () => {
  console.log(`Laya bot vs scripted players, ${games} games each (bot is player 2)`);
  for (const name of ['strikeOnly', 'guardOnly', 'breakOnly', 'specialSpam', 'random', 'mixed', 'reader']) {
    let laya = 0, reader = 0;
    const started = Date.now();
    for (let g = 0; g < games; g++) { if (await play(STRATEGIES[name], layaBot, g)) laya++; if (await play(STRATEGIES[name], readerBot, g)) reader++; }
    console.log(`${name.padEnd(12)} Laya bot ${laya}/${games}   reader bot ${reader}/${games}   (${((Date.now() - started) / 1000).toFixed(0)} s)`);
  }
})().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
