# How Object Arena uses Laya

[Laya](https://huggingface.co/convaiinnovations/laya) answers **typed questions** about a piece of text and returns calibrated probabilities. It never writes text. There are three question types:

| Type | Returns | Used here for |
| --- | --- | --- |
| `choice` | the top option, all probabilities, `answer_confidence` | element, reinforcement item, arena, the human's next move |
| `score` | an expected level from 0 to N (for example 2.7) | stat nudges |
| `noul` | P(yes) | safety check |

The split of work in the game: **Gemini looks at photos and writes text, Laya makes categorical calls, and code enforces every number and rule.** Each Laya job has its own time budget and falls back to deterministic code, so the game never waits on Laya or breaks without it.

All numbers below were measured on Sept 26, 2026, against a local CPU `laya-serve` (`laya[serve]==0.3.20`, English checkpoint). Setup is in the [README](../README.md#laya-decision-server-optional).

## 1. Fighter profile: element and stat nudges

`lib/decision/LayaProfileEngine.ts`, called from `/api/character` through `DecisionEngineService`.

- **Request:** one call with 5 questions (`LAYA_PROFILE_QUESTIONS`). The state is a sentence: "a laptop (electronics) made of aluminum, glass, plastic". Takes about 3–5 s on CPU.
- **Element:** Laya's pick is used when `answer_confidence >= 0.6`, except when a strong physical signal applies. Gemini's `electronic` flag keeps `electric`, and hot-object keywords keep `heat`. The reveal screen's **Laya's read** panel shows the pick, its confidence, and whether a rule overrode it.
- **Stats:** four `score` questions (attack, defense, health, speed). Each 0–4 score becomes a bounded nudge of `(score − 1.9) × 6`, clamped to ±8 stat points and applied on top of the rule-based stats. Laya's scores cluster around 1.9 for everyday objects, hence the center.
- **Class, tiers and trait stay rule-based.** That keeps `/api/character` and `/api/lore` in agreement (the jargon rule comes from the trait) without a shared cache.

Why it's built this way:

| What we tried | Result |
| --- | --- |
| Old one-shot `combatClass` choice (still in `LayaDecisionEngine`, kept for compatibility) | Returned `balanced` for 9 of 10 objects, **so every Laya fighter used to be balanced**. Replaced. |
| `choice` tiers (very_low…very_high) | Almost always `medium` |
| `score` ratings | Sensible order: rubber ball has the lowest attack (0.76), cast-iron pan the highest defense (2.73). Narrow range, hence nudges rather than full stats. |
| Element, JSON state | Biased toward `metal` (6 of 10) |
| Element, sentence state with examples in the options | Bottle→water 0.69, mug→heat 0.77, cast iron→metal 0.90; laptop→metal 0.93 (hence the electronic override) |
| 12 yes/no trait questions | Unreliable (pillow→charged, cast-iron pan→flow, laptop→shatter 0.73). Not used; traits stay keyword/property rules. |

## 2. Referee for Snap Reinforcement and Arena Snap

`lib/decision/layaScenes.ts`, called from `lib/ai/scenes.ts`.

- **Flow:** Gemini sees the photo and returns an object name (reinforcement) or a short scene description (arena), plus its own guess. Laya picks the category from Gemini's words. When Laya is off, slow (4 s budget) or unsure (`answer_confidence < 0.4`), Gemini's guess stands.
- **Response:** includes `decidedBy: 'laya' | 'gemini'`.
- **Measured:** 8/8 sensible items from object names (book→shield 0.92, duct tape→trap 0.88, charger→energy 0.71) and 6/6 arenas from scene descriptions (mostly 1.00). About 0.7 s each.
- **Live photos:** bottle→heal and laptop→energy (both `laya`), laptop photo→desk (`laya`). A close-up bottle photo is rejected for arena, which is correct: there are no surroundings to judge.
- **Why a 0.4 bar:** for a clear winner among 4–6 options, Laya's calibrated confidence sits around 0.45 (laptop→energy 0.45, runner-up 0.25).

This keeps the brief's rule that Gemini never decides game effects. Gemini's guess is only the backup.

## 3. Safety check on generated lore

`lib/ai/layaSafety.ts`, run by `lib/ai/structured.ts` after the regex blocklist. It's on by default for every flavor call. Lore checks only its people-facing fields (`loreSafetyFields`).

- **Questions:** three yes/no questions per line: insults a person (≥ 0.5), real violence (≥ 0.6), politics or religion (≥ 0.5). A hit discards the Gemini output, and the canned lore is used instead.
- **Owner names:** checked the same way before they go into the prompt. A flagged name is dropped.
- **Fails open:** if Laya is off, slow or erroring, the check passes and the regex blocklist still applies.

| Test | Result |
| --- | --- |
| Clean lore, per line | highest score 0.14 on any question: no false positives |
| "This bottle votes for whichever party promises more recycling bins." | politics 0.77, caught |
| "Kick his teeth in, bottle!" | violence 0.84, caught |
| "Our manager Dave is useless and everyone hates him." | person 0.71, caught |
| "Unlike our manager Dave, this bottle is actually useful." | person 0.18, **missed** (subtle digs pass) |
| Whole pack, or 550–1100 character chunks | bad lines diluted and missed; unreliable |
| 300 character chunks | clean cartoon narration flagged as violence |

Profanity and alcohol are left to the regex blocklist, which already covers them. **Cost:** about 1 s per line on CPU, roughly 12 s per Lore Pack after Gemini. The card shows standard lore first and upgrades when the checked lore arrives. On a GPU this drops sharply.

## 4. Solo mode: predicting your next move

`lib/decision/layaBot.ts`, `app/api/bot-move/route.ts`, `lib/game/bot.ts`. Rules and UI are in [GAME_DESIGN.md](GAME_DESIGN.md#solo-mode-play-against-laya).

- **Laya predicts, code counters.** Asked to choose the bot's move, Laya copied the human's last move (after guard ×3 it said guard). Asked to *predict* the human, it spots habits: strike ×3 → strike 0.83; strike, guard, strike, guard → strike 0.55; guard, special, guard, special → special 0.45.
- **Code does the game theory:** it blends Laya's prediction 50/50 with the human's recent move frequencies, masks unaffordable Specials, adds 15% doubt, computes each move's expected value from `CLASH_TABLE`, and samples with softmax (temperature 0.3).
- **Latency:** about 0.7–1.2 s per round, requested at round start while the human is still choosing.
- **Evaluation:** `npx tsx scripts/bot-eval.ts [games]` plays the Laya bot and the built-in `reader` bot against each scripted strategy on the same seeds.

Live results (6 games per opponent, bot as player 2, demo fighters, CPU Laya):

| Opponent | Laya bot | Built-in `reader` bot |
| --- | --- | --- |
| strike only | 6/6 | 6/6 |
| guard only | 6/6 | 6/6 |
| break only | 6/6 | 6/6 |
| special spam | 6/6 | 5/6 |
| random | 5/6 | 4/6 |
| mixed (near-equilibrium) | 6/6 | 3/6 |
| reader (pattern punisher) | 4/6 | 3/6 |

- **The blend matters.** The first version used Laya's prediction alone and beat guard-only only 4/10. A guard-only player builds a full energy bar, so Laya kept predicting "special" and the bot guarded back. Blending 50/50 with the human's actual last-4-move frequencies fixed it (6/6).
- **Small samples:** 6 games per opponent is indicative, not a balance proof. Rerun with more games on a faster machine.

## Running it faster

Everything above runs on CPU and was designed around CPU latency. On a machine with an NVIDIA GPU, set `LAYA_DEVICE=cuda` (or `mps` on Apple Silicon) before `scripts/start-laya.*`, and lower `LAYA_TIMEOUT_MS` to about 2500. The package also ships an ONNX agent and a TileLang fast path (`laya[fast]`, CUDA only). Neither has been measured here.
