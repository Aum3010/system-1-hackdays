# Object Arena checkpoints

Working branch: `new-work`. Original repository preserved in the sibling folder.

## Checkpoint 0 — repository inspected
- Empty project: README and .gitignore only. No existing routes/package.json.
- Installed requested Gemini skill under .agents/skills/gemini-api-dev.
- Shared canonical object, decision, character, and battle types created.
- Next: install dependencies; implement UI, AI and deterministic game modules.
- Run once installed: `npm run dev`.
- Initial provider credentials were absent; Gemini was configured and verified later (see below).

## Checkpoint 1 — base app, shared contracts and UI shell
- Next16.3.6 / React19.3 / TypeScript / Tailwind / Zod installed, npm lockfile saved.
- Canonical `types/*`, schemas, modular UI components, responsive stylesheet and app shell implemented.
- Server runs at http://127.0.0.1:3000 (`npm.cmd run dev`). Original main worktree unchanged.
- Files: package/config files, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `components/*`, `types/*`.
- Next at milestone: integrate real perception and decision APIs.

## Checkpoint 2 — real Gemini image recognition
- Real key is now configured in this worktree's ignored `.env.local`. Do not ask again or print it.
- Google models API200, text interaction completed, real bottle/laptop recognition passed.
- Fixed unsupported `thinking_level:'minimal'` to `'low'`.
- Fixed ambiguous top-level union by using private `{rejected,rejectionReason,analysis}` envelope. Public ObjectAnalysis contract unchanged.
- Rejections, low-confidence output, malformed responses, retry bound and timeouts covered by tests.
- Files: `lib/ai/*`, `lib/api/http.ts`, `lib/validation/schemas.ts`, `app/api/object-analysis/route.ts`, `tests/ai.test.ts`.
- Known limitation: bundled stapler photo has three objects and is correctly rejected; acquire a single-stapler image for positive test.
- Next at milestone: finish and verify character generation.

## Checkpoint 3 — Laya/fallback and character generation
- Real Laya HTTP adapter implemented with typed questions, validation and abort/timeout.
- Deterministic material/property fallback, bounded20–100 stats and cosmetic rarity implemented.
- `/api/decision` and `/api/character` passed HTTP checks. Actual Gemini analyses created schema-valid fighters with fallback.
- Three offline demo fighters and local photos bundled.
- Files: `lib/decision/*`, `lib/game/*`, character/decision API routes, `public/fighters/*`, `tests/game.test.ts`.
- Known limitation: live Laya endpoint remains unconfigured/unverified; user is setting it up and wants to be asked when needed.
- Next: ask for Laya endpoint; keep fallback operational.

## Checkpoint 4 — full two-player battle
- Full UI state machine implemented: landing, capture, reveal, second fighter, VS, battle, winner, rematch/reset.
- Immutable seeded engine, type matchups, one special/player, two guards/player, capped match length.
- Damage capped at55% target maxHP to prevent one-hit wins in signature demo.
- Offline browser flow passed including defend/special, HP logs, winner, rematch and scan-new.
- Fixture browser flow passed4000×6000 photo compression to≤1024px, two reveals, long names/mobile overflow, battle and persistence.
- Live unmocked browser test **PASSED**: two actual photo uploads → Gemini → fallback → fighters → battle → winner (14.9s test time).
- Files: UI components, `app/page.tsx`, `lib/game/battleEngine.ts`, `lib/image/compress.ts`, Playwright config/tests.
- Next: complete live Laya and remaining real-image matrix.

## Checkpoint 5 — handoff, verification and polish status
- `npm.cmd test`: **20 passed** after Gemini envelope fix.
- `npm.cmd run build`: **PASSED** after the final Gemini envelope and diagnostic-script changes; TypeScript and all routes compiled.
- `npm.cmd run verify:api`: passed against running server.
- `npx.cmd playwright test`: **3 passed / 1 intentionally skipped live test**; all offline/fixture browser checks passed.
- `$env:LIVE_AI='1'; npx.cmd playwright test --grep 'LIVE Gemini'`: **1 passed**.
- Visually inspected desktop landing and mobile battle screenshots; coherent styling, loaded images, usable HP/actions, no observed overflow. More320px/real-device review remains useful.
- Fixed duplicate `goHome` helper from overlapping edits, JSX closing tag, Tailwind dependency and product alert selector collision.
- Handoff files: `HANDOFF.md` (complete runbook), `NEXT_AGENT_PROMPT.md` (copy/paste prompt), parent `CONTINUE_HERE.md` (directory pointer). README/ARCHITECTURE/INTEGRATION explain setup and module reuse.
- **FULL DEMO FLOW VERIFIED: YES — real Gemini + fallback decisions. Live Laya NOT verified.**
- Remaining exact tasks: configure/test real Laya; single-stapler + six other real photos; dark/person/unclear real-image rejection tests; physical camera test; remaining visual review. Keep scope local two-player MVP.
- No commits or pushes. `.env.local` must remain ignored. Next agent should read HANDOFF first, not rescan unrelated folders or reinitialize the app.

## Checkpoint 6 — live Laya verified (local CPU)
- `pip install "laya[serve]"` into git-ignored `.venv` (Python 3.12, torch CPU). `transformers.pipeline()`/`AutoModel` do NOT work for Laya; the custom SDK/server is required.
- Start: `$env:LAYA_DEVICE='cpu'; $env:LAYA_PRELOAD='1'; $env:LAYA_MODELS='english'; $env:LAYA_HOST='127.0.0.1'; .\.venv\Scripts\laya-serve.exe` (port 8000; ~1.5GB model cached in ~/.cache/huggingface on first run).
- `.env.local`: `LAYA_ENDPOINT=http://127.0.0.1:8000`, `LAYA_TIMEOUT_MS=12000`. CPU latency ~4.2–5.7s per six-question request, so the timeout clamp was raised from 5000 to 15000.
- `npm run verify:live`: bottle and laptop -> **decisionProvider=laya**. 20 unit tests + typecheck pass.
- Observation: Laya's tier answers are mostly `medium` (cast-iron pan -> tank/metal, bottle -> balanced/water, laptop -> balanced/metal). Richer state text could improve differentiation.

## Checkpoint 7 — combat redesign: blind picks + energy
- Replaced alternating attack/special/defend with simultaneous secret picks (Strike/Guard/Break/Special) and an energy meter. Rules and simulation results: `docs/GAME_DESIGN.md`.
- New API: `resolveRound(state, move1, move2)`, `canUse`, `CLASH_TABLE`; `runBattle`/`currentTurn`/`specialUsed` removed. `BattleState` now has `energy` and `round`; log entries are `RoundEvent`s.
- UI: keyboard mode (A S D F vs J K L ;) and pass-the-phone mode with cover screens (default on coarse pointers); clash banner, damage pop, energy pips.
- Simulation: special spam wins 0% vs guard-only and 7% vs a pattern reader; every pure strategy has a hard counter; avg ~6 rounds.
- `npm test` 23 passed; typecheck and `npm run build` pass; Playwright 3 passed / 1 live skipped (keyboard picks, pass-the-phone flow, winner, rematch, reset, mobile); `verify:live` passed with `decisionProvider=laya`.
- Browser fixture tests now wait up to 20s for reveals because `/api/character` calls real Laya (~5s on CPU) when configured.
- Not yet done: real phone test of pass-the-phone mode; playtesting with humans to tune `CLASH_TABLE`.

## Checkpoint 8 — Tier 1 mechanics + animation Phase 1 (reveal timeline)
- Engine: 12 Signature Traits (`lib/game/traits.ts`), Call It, Snap Reinforcement (`applyReinforcement`), arena buff, Scald burn / Snare / Shield / Trap statuses. `resolveRound(state, m1, m2, calls?)`. Balance tooling in `lib/game/simulate.ts`; report via `npx tsx scripts/simulate.ts`.
- Traits are chosen deterministically (`pickTrait` in FallbackDecisionEngine) from Gemini properties. A Laya trait question was tried and removed: it picked scissors→bulwark at ~0.35 confidence and pushed latency to 7.5–9 s.
- Balance: every trait 41–54% at equal skill (test guard: 38–58%). Improved `reader` heuristic beats break-only 92% (was 40%), all fixed strategies 89–99%.
- One-liners: `lib/ai/battleLines.ts` text-only Gemini call in `/api/character`, parallel with Laya (character step ~5.8 s live, unchanged). Main scan prompt left unchanged (adding lines there pushed the scan toward the 12 s timeout and Gemini ignored the optional field).
- Animation Phase 1: `lib/fx/timeline.ts` (pure event derivation, unit-tested), `hooks/useBattleTimeline.ts`, `hooks/useFxSettings.ts` (`object-arena-fx-v1`), `components/fx/*`, `app/animations.css`. 3-2-1 countdown, card flip, clash callouts, hit-stop, shake, damage numbers, ghost HP bar, energy pip gain/spend/threat pulse, one-liner bubbles, trait tags. Input re-enables when the timeline finishes (9 s safety fallback). Skip animations toggle + reduced motion = instant.
- Base-UI freeze: `tests/browser/visual.spec.ts` pixel-compares landing and capture against baselines captured before the animation work. Passing.
- Verified: `npm test` 32 passed, typecheck, build, Playwright 6 passed / 1 live skipped (existing game.spec.ts unchanged).
- Pending: Snap Reinforcement camera flow + `/api/reinforcement`, Arena Snap + `/api/arena`, Counter-Hunt, animation Phases 2–4.

## Checkpoint 9 — Tier 2 mechanics, pre-game briefing, animation Phases 2–4
- Snap Reinforcement: SNAP pick (G/H) → 15 s `SnapModal` (camera or upload) → `/api/reinforcement` (Gemini picks heal/shield/energy/trap) → `applyReinforcement`. Runs while players keep picking; timeout/rejection/failure → no item. Live: bottle→heal, laptop→energy (1.4–4 s).
- Arena Snap on the VS screen → `/api/arena` → `createBattle(..., { arena })`; arena chip on battle screen. Live: laptop photo→desk.
- Counter-Hunt: toggle on Player 1's reveal → 60 s banner on Player 2's capture screen (clock stops at photo selection) → `applyHuntBonus` (lib/game/counterHunt.ts) → badge on the card.
- Pre-game "HOW TO WIN THIS FIGHT" briefing on the VS screen (moves, energy, Call It/Snap keys, both fighters' traits); How-to-play dialog gained a "Use your extras" item.
- Phase 2: VS intro (pointer-events: none, never blocks picks), KO slow-mo + grayscale/crack, confetti in the winner's element colour. Phase 3: card flip-in, stat count-up + bar grow, rarity flourish (rare shimmer, epic pointer tilt, absurd flash + name reveal); scan line already existed. Phase 4: Web Audio blips (muted by default, `lib/fx/sound.ts`), `navigator.vibrate` on hits.
- New styles only in `app/animations.css` and `app/features.css`.
- Verified: `npm test` 33 passed; typecheck; build; Playwright 10 passed / 1 live skipped (existing game.spec.ts unchanged; visual baseline for landing/capture still pixel-identical); `verify:live` passed (Laya); LIVE Gemini browser test passed (44.9 s) with animations on.
- Not verified: audio output and vibration on a real phone (no automated audio assertion); physical camera capture on a phone.

## Checkpoint 10 — "Unhinged Corporate" Phase 1: persona, Lore Pack, announcer
- `lib/ai/persona.ts` (shared system instruction + mild/spicy/unhinged), `lib/ai/structured.ts` (JSON schema → Zod with server-side truncation → safety blocklist → retry once → canned fallback; injectable transport), `lib/ai/safety.ts`, `lib/ai/fallbackLore.ts` (game fully playable without GEMINI_API_KEY).
- `/api/lore` (8 s budget) fired in parallel with `/api/character`; the card upgrades when lore lands. The separate one-liners call (`battleLines.ts`) was removed; the Lore Pack's `trashTalk` feeds the VS-intro opener.
- Jargon rule is picked in code (`lib/game/jargon.ts` via `lib/game/identity.ts`, shared by both routes); effects arrive in Phase 3.
- Announcer: `lib/fx/announcer.ts` + `announce` timeline event pick a seeded line from the owner's `announcerBank`, fill `{self}/{opponent}/{move}`, and show it as a strip. No network calls in combat.
- Spice picker + optional owner name/team in the floating settings pill (spice persisted; owner details in memory only; owner names scrubbed from generated text before the roster is saved). Reveal screen shows a personnel file with the origin icebreaker (answer kept in memory).
- Visual baseline test now hides the floating pill (`tests/browser/hide-overlays.css`); base UI still pixel-identical.
- Verified: `npm test` 38 passed (incl. mocked-Gemini valid/invalid-retry/timeout/unsafe/no-key tests); build; Playwright 11 passed / 1 live skipped; `verify:live` passed; LIVE Gemini browser test passed. Real `/api/lore` ≈4.9 s, source=gemini.

## Checkpoint 11 — Laya expansion: profile, referee, lore safety, solo bot
- Probed a live CPU `laya-serve` before building (Sept 26). Findings: the old one-shot `combatClass` choice returned `balanced` for ~9/10 objects, so every Laya fighter was balanced; tier choices collapse to `medium`; 12 yes/no trait questions were unreliable (dropped). Laya is strong at categories from short text, per-line yes/no checks, and spotting move habits. Full write-up: `docs/LAYA.md`.
- `lib/decision/layaClient.ts`: shared client (choice / score / noul; reads `answer_confidence`). `LAYA_TIMEOUT_MS` clamp raised to 30000.
- A (profile): `LayaProfileEngine` is the service default. Class, tiers and trait stay rule-based; Laya sets the element when confidence ≥ .6 (electronic/hot overrides) and 4 `score` questions give ±8 stat nudges. The legacy `LayaDecisionEngine` is kept unchanged (its tests are unmodified). New `layaRead` on decisions and characters; reveal panel `components/LayaRead.tsx`.
- B (referee): Gemini returns an object name / scene description; `lib/decision/layaScenes.ts` picks the reinforcement item or arena (bar .4, 4 s budget), falling back to Gemini's guess. Responses gain `decidedBy`. Arena output cap raised 200 → 400 tokens (the added `scene` field truncated JSON once).
- E (safety): `lib/ai/layaSafety.ts` runs after the regex blocklist inside `generateStructured` (default on; `safetyCheck` option). Per line, 3 questions (person/violence/politics). Lore checks only people-facing fields; owner names are checked and dropped if flagged. Whole-pack or chunked checks were unreliable (measured). Misses subtle digs (~.18). Adds ~12 s per Lore Pack on CPU.
- D (solo): VS-screen toggle "Play solo vs Laya". `/api/bot-move` → Laya predicts the human's next move; `lib/game/bot.ts` blends it 50/50 with recent move frequencies, then picks by `CLASH_TABLE` expected value + softmax (T=.3, 15% doubt). Falls back to `reader`. Blind: requested at round start. Laya-only prediction lost to guard-only 4/10 (over-predicted Special), hence the blend.
- C (debrief ratings) is deferred to Phase 2 (match debrief), where it belongs.
- Live bot eval (`scripts/bot-eval.ts 6`): Laya bot ≥ reader bot against every scripted opponent; mixed 6/6 vs 3/6, reader 4/6 vs 3/6, guard-only 6/6 after the blend.
- Verified: `npm test` 48 passed (38 existing unmodified + 10 new in `tests/laya.test.ts`); typecheck; `verify:live` on :3001 → `decisionProvider=laya`; live reinforcement bottle→heal / laptop→energy and arena laptop→desk all `decidedBy=laya`; `/api/bot-move` 200 (strike×3 → strike .83).
- Browser: Playwright 15 passed / 1 live skipped against :3001 (includes 3 new `tests/browser/solo.spec.ts`: solo match to winner with blind requests, built-in fallback notice, Laya's read panel). `npm run build` passed (new route `/api/bot-move`).
- One existing test changed, timing only: `finishBattle` in `tests/browser/game.spec.ts` loops 45 times instead of 20. The fixture fighters used to be `balanced` only because old Laya collapsed every class (strike-vs-strike averaged 4.0 rounds); with rule-based classes the bottle is a 100-DEF tank (10.9 rounds, max 12), which the old budget couldn't fit. No assertion changed; the same would happen with Laya off.
- Known: lore arrives ~12 s later with Laya on (per-line safety on CPU); the card upgrades in place. Only ~0.9-1.5 GB RAM free on this machine while Laya, the dev server and Pocket Rivals (:3000) run.
- Next: user review of solo mode and Laya's read at http://127.0.0.1:3001 (port 3000 is used by another project); then Phase 2 (match debrief), including idea C (Laya picks review ratings and highlight moments).
