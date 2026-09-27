# Combat design: blind picks, energy, traits

Source of truth: `lib/game/battleEngine.ts`. Tests: `tests/game.test.ts`.

## Why we changed it

The original combat used alternating turns where everything was visible: attack, one special per match, or defend. In practice:

- **Nothing to out-guess.** You could see whether the opponent was guarding before choosing, so there was no bluffing.
- **Defending rarely paid off.** It gave up your whole attack to soften one hit, and was only worth it against much stronger fighters.
- **Speed decided too much.** The faster fighter always moved first.

So the dominant play was attack, attack, special at the first opening, attack, and the fighter with better stats usually won.

## The rules

Each round **both players secretly pick a move at the same time**. The two picks are then revealed and resolved together.

| Move | Beats | Loses to |
| --- | --- | --- |
| **Strike** | Break (interrupts it) | Guard |
| **Guard** | Strike (blocks and counters for 0.6×), Special (blocks and counters for 1.0×) | Break |
| **Break** | Guard (1.2× and drains energy) | Strike, Special |
| **Special** (costs 3 energy) | Strike and Break (1.8×) | Guard (deals only 0.25× chip, then gets countered) |

**Same-move clashes:**
- Strike vs Strike: both take 1×.
- Break vs Break: both take 0.5×.
- Special vs Special: both take 1.2×.
- Guard vs Guard: no damage, and both gain bonus energy.
- In these clashes the faster fighter deals +10%. That's where speed matters now.

**Energy:**
- Starts at 0, max 5.
- +1 every round.
- +1 extra for guarding.
- A guard that gets broken nets −1 instead.
- Meters are visible, so a player at 3+ energy is a known threat. That's the bluffing layer: do you guard against the special, or punish the guard with a Break?

**Damage:**
- The base hit is `attack × 0.42 × type multiplier × variation − defense × 0.12`, with a floor of 6.
- That base is multiplied by the outcome multiplier from the table above.
- A single hit is capped at 50% of the target's max HP.
- Variation (0.92–1.08) comes from a seeded generator, so matches can be replayed exactly.

**End of match:**
- A fighter at 0 HP loses.
- If both reach 0 in the same round, the one that dealt more damage that round wins, and speed breaks exact ties.
- After 12 rounds, the higher HP percentage wins, then speed.

## Game-theory check

Without Special, the moves form a weighted rock-paper-scissors: Strike beats Break by 1.0, Break beats Guard by 1.2, and Guard beats Strike by 0.6. Its equilibrium is a mix of roughly **43% Strike, 36% Guard and 21% Break**. No single move is best, and predictable players get punished.

We simulated 1,800 games per matchup across all demo pairings and both seats. These are win rates for the row strategy:

| Row vs column | random | special spam | strike only | guard only | break only | mixed | reader |
| --- | --- | --- | --- | --- | --- | --- | --- |
| special spam | 61% | 50% | 70% | **0%** | 100% | 51% | **7%** |
| guard only | 45% | 100% | 100% | 50% | **0%** | 66% | **4%** |
| reader (punishes patterns) | 48% | 89% | 91% | 99% | 92% | 52% | 51% |

- **Every fixed strategy has a hard counter.** Spamming Special loses to a guarding player every time.
- **Reading your opponent is the winning skill.** The reader beats every predictable strategy 89–99% of the time.
- **Reader fix:** an earlier version of the reader heuristic lost 40% to break-only, because it kept guarding against Specials from a player who never used one. It now respects the Special threat only after the rival has actually used a Special.
- **Reproduce these numbers:** run `npx tsx scripts/simulate.ts`. The strategies live in `lib/game/simulate.ts`.
- **Stats still matter, but less than skill.** At equal skill, the fighter with better stats or type wins about 65–70%.
- **Pace:** about 6 rounds per match, with ~7% going to the round limit.

## Signature Traits: each object bends one rule

Every fighter gets exactly one trait, chosen from its physical properties. Each trait changes a single cell of the clash table or a single energy rule. That makes "the object matters" literally true, and players have to think about what the opponent *is*.

| Trait | Comes from | Rule change |
| --- | --- | --- |
| Pierce | Sharp (scissors, pen, stapler) | Strike vs Guard deals 0.3× chip instead of 0 |
| Crush | Heavy (chair, dumbbell) | Breaking a Guard drains 2 energy instead of 1 |
| Charged | Electronic (laptop, phone) | Starts the match with 2 energy |
| Cushion | Soft (pillow, plush) | Takes 0.75× from Break |
| Flow | Liquid container (bottle, mug) | Guard vs Guard gives +2 bonus energy instead of +1 |
| Shatter | Fragile (glass, egg) | Special costs 2, but it takes +10% damage |
| Snare | Sticky or elastic (tape, rubber band) | A successful Guard counter steals the speed tiebreak next round |
| Scald | Hot (coffee, lamp, kettle) | Guard counters burn for 4 damage per round for 2 rounds |
| Rebound | Springy (ball, eraser, sneaker) | When its Guard is broken, it bounces back 0.4× |
| Rush | Built to move (wheels, skateboard) | Wins same-move clashes by +25% instead of +10% |
| Bulwark | Sturdy (box, helmet, book) | Guard counters Strike for 0.8× instead of 0.6× |
| Slippery | Small or smooth (coin, soap, keys) | Specials hit it for 1.4× instead of 1.8× |

**How a trait is chosen:**
- `pickTrait` in `lib/decision/FallbackDecisionEngine.ts` checks object keywords first, then physical properties (electronic, sharp, fragile, heavy, sturdy, light), then combat class.
- It's deterministic, and the same rule is used whether Laya or the fallback made the other decisions.
- We tried asking Laya for the trait. It picked badly (scissors came back as Bulwark, a bottle as Slippery) at about 35% confidence, and the extra question pushed each call to 7.5–9s. So Laya keeps its original six questions.

**Balance guardrail:** in a round robin where every fighter has identical stats and both players use the near-equilibrium mix, every trait wins between 41% and 54%. A unit test fails if any trait goes above 58% or below 38%. Shatter's damage penalty was cut from +20% to +10% because at +20% it won only 35–39%.

## Call It: a once-per-match prediction

Once per match a player can lock in their move **and** a guess of the rival's move. Press Q (P1) or P (P2), or click CALL IT.

- **Right guess:** your hit that round deals 1.5×, and the reveal shows "CALLED IT!".
- **Wrong guess:** you take +25% damage that round.

This turns the core skill, reading your opponent, into one dramatic moment. The guess is hidden like the move.

## Snap Reinforcement: a physical scramble mid-battle

Once per match a player can pick **SNAP** (G for P1, H for P2) instead of a move.

1. **The round:** the snapper deals nothing, and the rival's move lands as if against an open target. Strike and Break hit for 1×, Special for 1.8×, and Guard does nothing.
2. **The photo:** after the reveal, the snapper gets **15 seconds** to photograph something nearby.
3. **The item:** Gemini names the object, Laya picks one of the four fixed item types from that name (Gemini's own guess is the backup when Laya is off or unsure), and the effect applies as soon as the answer arrives. The analysis runs while both players pick the next round.

| Item | Examples | Effect |
| --- | --- | --- |
| Heal | food, drinks, plants, soap | +25% max HP |
| Shield | books, lids, boxes, cases | Halves the next 2 hits taken |
| Energy | batteries, chargers, coffee | +3 energy |
| Trap | tape, clips, string, rubber bands | The rival's next hit is halved and they take 10 |

If the timer runs out, the photo is rejected, or Gemini is unavailable, the player gets nothing. The AI only chooses which of the four categories the object fits. The effects themselves are fixed in `applyReinforcement`.

## Arena Snap: the battlefield is a photo too

On the VS screen, players can optionally photograph their surroundings. Gemini describes the scene in a few words, Laya picks one of six arenas from that description (Gemini's pick is the backup), and each arena gives one element +10% damage:

| Arena | Boosted element |
| --- | --- |
| Kitchen | Heat |
| Desk | Metal |
| Outdoors | Nature |
| Bedroom | Chaos |
| Lab | Electric |
| Street | Water |

That's one classification call before the fight, and none during it.

## Counter-Hunt

After Player 1's fighter is revealed, they can challenge Player 2 to a Counter-Hunt. Player 2 then has **60 seconds** to photograph an object that counters Player 1's element. The timer stops when the photo is taken, not when the analysis comes back.

- **Beat the type within 60 seconds:** +8 attack and +4 defense.
- **Speed bonus:** up to +10 speed for any photo taken within 60 seconds, scaled by how much time is left.
- **Metal and Chaos:** they have no type weakness, so only the speed bonus is available.
- **Visibility:** earned bonuses appear as a badge on the fighter card.

## Reveal presentation (no rule changes)

The animation layer only replays results that the engine has already worked out:

- `lib/fx/timeline.ts` turns each round into an ordered script: countdown → card flip → clash callout → hit-stop → hits → HP → energy → one-liner → KO.
- `hooks/useBattleTimeline.ts` plays that script, and picks re-open only when it finishes.

**One-liners:** each fighter has eight lines (opener, counter, guardBreak, special, calledIt, comeback, knockout, ouch).
- **Scanned fighters:** a small text-only Gemini call writes the lines at capture time, in parallel with Laya.
- **Demo fighters:** their lines are hand-written.
- **Fallback:** if generation fails, generic lines are used.

Combat never calls AI.

**Skip animations and reduced motion:** turning on "Skip animations" (saved in localStorage under `object-arena-fx-v1`), or having a system reduced-motion setting, collapses the reveal to instant updates. Text callouts are kept.

## Before the fight: briefing

The VS screen shows a "HOW TO WIN THIS FIGHT" card before anyone enters the arena. It covers:
- the counter triangle and energy;
- the Call It and Snap keys;
- both fighters' Signature Traits, with their exact rule text.

The How to play dialog in the header covers the same rules.

## Input on one device

- **Keyboard mode** (default on desktop): P1 presses A/S/D/F and P2 presses J/K/L/; at the same time. A pick shows only as "LOCKED IN" until both players have chosen.
  - Snap: G (P1), H (P2).
  - Call It: Q (P1), P (P2). After picking a move, the same five keys choose the guess.
- **Pass-the-phone mode** (default on touch devices; either mode can be switched from the battle screen):
  1. A cover screen asks for Player 1.
  2. Player 1 picks.
  3. The cover screen asks for Player 2.
  4. Player 2 picks.
  5. The clash is revealed.

## Solo mode: play against Laya

No second player? On the VS screen, **Play solo vs Laya** makes Player 2 a bot.

- **Blind, like a human:** at the start of each round, before you pick, the bot sends only your past moves and both energy levels to `/api/bot-move`.
- **Laya predicts, code counters:** Laya predicts your next move from your habits. Asked to pick a counter directly, it simply copied your last move, so it doesn't choose. `lib/game/bot.ts` scores each legal move against that prediction using `CLASH_TABLE`, then picks with a softmax (temperature 0.3), so the bot stays a mixed strategy.
- **Doubt:** 15% of the prediction is replaced by a uniform guess, and a Special you can't afford is ruled out.
- **Fallback:** without Laya (off, slow or erroring) the built-in `reader` strategy plays, and the pad says so.
- **Measured:** see `scripts/bot-eval.ts` and [LAYA.md](LAYA.md). A unit test proves the counter logic beats every fixed strategy (>75%) when given a pattern predictor.

The bot never uses Call It or Snap.

## Tuning knobs

All in `battleEngine.ts`:

- `CLASH_TABLE`: outcome multipliers.
- `SPECIAL_COST`, `MAX_ENERGY`, `START_ENERGY`: energy economy.
- `MAX_ROUNDS`: round limit.
- `HIT_CAP`: maximum share of max HP one hit can take.
- The `0.42` attack scale: overall match length.
- `CALL_BONUS`, `CALL_PENALTY`, `BURN_DAMAGE`, `TRAP_DAMAGE`: Call It and status effects.
- Trait effects: the "Signature Traits" block inside `resolveRound`. Trait names and rule text are in `lib/game/traits.ts`.
- Arenas and reinforcement items: `lib/game/arenas.ts`.
- Solo bot: `BOT_TEMPERATURE` and `BOT_DOUBT` in `lib/game/bot.ts`.

After changing any of these, re-run `npm test`. The "no move dominates", "special spam is punished" and trait-balance tests guard the design.
