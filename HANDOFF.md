# Object Arena — continuation handoff

Updated September 26, 2026. Read this before editing. The user requested this document so a smaller model can continue without the full conversation.

## 1. Working directory and source control

> **On another machine / new contributor?** Follow the Quick start in [README.md](README.md): clone, `git checkout new-work`, `npm install`, create `.env.local`, optionally install Laya from `requirements-laya.txt`. The Windows paths below describe the original dev machine only.

```text
C:\Users\prath\Desktop\Programs\Hack_day\
  system-1-hackdays\           original repository, branch main; leave alone
  system-1-hackdays-new-work\  THIS APPLICATION, branch new-work
```

`new-work` is a Git worktree based on initial commit `654e2e5`. The original project contained only README and .gitignore. All application files were added here; no existing application was overwritten. No commit or push has been made. User originally deferred commits/push; preserve that preference. Git identity was also incomplete at inspection (one identity query returned a value, the other did not). Do not change global Git identity.

The parent `Hack_day` folder is not a Git repo. Do not run git init or work from the wrong sibling folder.

## 2. Product and scope

**Object Arena: Everything is playable. Snap it. Spawn it. Battle it.**

Required flow: landing → player 1 photo/upload → compression → real Gemini object analysis → real Laya categorical decisions or automatic deterministic fallback → character reveal → player 2 repeat → VS → local turn-based combat → winner → rematch or new scans.

This is a two-player, one-device game. No accounts, database, real-time networking or external persistence. No AI-generated artwork: the uploaded object photo is the main visual. Rarity is cosmetic, never an advantage. Gemini must never choose stats or winners.

Other future hackathon ideas must reuse `ObjectAnalysis` or `GameCharacter` without the battle/UI. Preserve this separation.

Visual direction is implemented: cream background, heavy black typography, purple/lime/coral arcade accents, tilted object cards, large VS, stat/HP bars, responsive layouts. Polish existing design rather than redesigning it.

## 3. Actual verification status — do not exaggerate

| Check | Last known result |
| --- | --- |
| Dependency installation | Pass, npm audit reported zero vulnerabilities |
| Next.js server launch | Pass, localhost:3000 |
| Production build | **Passed** after final Gemini envelope/diagnostic changes; rerun after future code edits |
| Unit/API-handler tests | **48 passed** after the Laya expansion (Checkpoint 11); see CHECKPOINTS for the latest count |
| HTTP integration against running server | Passed: page, decisions, characters, malformed requests/images |
| Real Gemini recognition | **Pass** for actual bottle/laptop photos after request fixes |
| Real Laya inference | **Pass** (Sept 26): local CPU `laya-serve` on :8000; `verify:live` bottle/laptop → `decisionProvider=laya`. Laya now has four jobs (profile, referee, lore safety, solo bot); see [docs/LAYA.md](docs/LAYA.md) |
| Browser suite / visual review | Three offline/fixture tests passed; desktop landing/mobile battle screenshots inspected |
| Full real-photo browser demo | **PASS**: live two-photo Gemini test reached a winner in Chromium; that run used fallback (before Laya was set up); browser run with live Laya not yet repeated |

Tests use clearly explicit provider fixtures where noted. They do not prove real Gemini object recognition or real Laya inference.

## 4. User's latest credential messages

User said: **“i have configured google gemini api key and added to env.local i am trying to configure laya see how we can do it ask me again when you need it”**.

**Resolved:** the user subsequently saved the key in the correct `.env.local`. Google models API returned200, `gemini-3.8-flash` is available, a minimal text interaction completed, and real photo recognition now works. Do not ask them to configure the key again. Do not print the file or secret value. Inspect only variable names and boolean configured status.

Two real integration bugs were fixed: `thinking_level:'minimal'` returned400 (this model supports low/medium/high), so use `'low'`; a top-level JSON-schema union led the model to return an invalid rejection-shaped success. The transport now requests a single-root `{rejected,rejectionReason,analysis}` envelope, validates it, then unwraps it into the unchanged public ObjectAnalysis/ObjectRejection contract. Preserve these fixes.

Actual observed examples: bottle→“Hydro Sentinel”, laptop→“Mac the Clamshell” (names vary per call). The bundled stapler image contains THREE staplers and was rejected for ambiguity; this is correct, not a missing-key failure. The demo roster can still use that image, but obtain a single-stapler photo for a positive recognition test.

**Laya (updated):** now running locally via `laya[serve]==0.3.20` in `.venv` (CPU only, no GPU on this machine). Start with `scripts/start-laya.ps1`; `.env.local` has `LAYA_ENDPOINT=http://127.0.0.1:8000`, `LAYA_TIMEOUT_MS=12000`. `transformers.pipeline()`/`AutoModel` do not work for Laya. See README "Laya decision server" and CHECKPOINTS 6.

## 5. Stack and commands

Next.js 16.3.6 App Router, React 19.3.0, TypeScript, Tailwind + custom CSS, Zod 4, `@google/genai` 2.24.0, lucide icons, React state/localStorage. Node observed: 22.11.0. npm lockfile present; use npm.

```powershell
Set-Location C:\Users\prath\Desktop\Programs\Hack_day\system-1-hackdays-new-work
npm.cmd install                      # only if dependencies need restoring
npm.cmd run dev                      # http://127.0.0.1:3000
npm.cmd test                         # tests/*.test.ts: AI + game + route handlers
npm.cmd run typecheck
npm.cmd run build
npm.cmd run verify:api               # requires running app; explicit analysis fixture
npm.cmd run verify:live              # requires running app + working real Gemini
npx.cmd playwright test              # offline/fixture browser tests; live test skipped
$env:LIVE_AI='1'
npx.cmd playwright test --grep 'LIVE Gemini'
Remove-Item Env:LIVE_AI
```

Playwright Chromium has been installed locally. Browser suite expects an already running app; config deliberately does not spawn another server. `APP_URL` can override localhost. `npm run start` serves the production build if needed.

Next dev server was left running in tool session `33762`; session IDs may not survive model/session changes. Make one localhost request before starting a duplicate. Browser suite session and final results are recorded in CHECKPOINTS if still running.

The in-app Browser plugin returned “No browser is available”; troubleshooting showed an empty browser list. Standalone Playwright was installed as fallback, after reading the required Browser skill. Do not waste time repeatedly reconnecting an unavailable browser. Use existing tests and screenshots. Playwright cleans `test-results` between runs; run the full suite when you want all screenshots together.

Command runner frequently fails inside the sandbox with `helper_unknown_error: setup refresh had errors`. The command itself did not execute. Rerun an important command using `sandbox_permissions: require_escalated` with a short explanation; do not repeatedly retry the broken sandbox. This is a Windows PowerShell environment. Avoid Unix-only commands. Do not print `.env.local`.

## 6. Read order and file map

Read `AGENTS.md` first. Next 16 generated it; it requires reading relevant guides from `node_modules/next/dist/docs/` before code changes. Relevant guides: `01-app/01-getting-started/05-server-and-client-components.md`, `11-css.md`, `15-route-handlers.md`.

For Gemini changes read `.agents/skills/gemini-api-dev/SKILL.md`, installed at user's request using `npx skills add google-gemini/gemini-skills --skill gemini-api-dev --agent codex --yes`. Follow its linked current official structured-output/image-understanding documentation. Do not switch to obsolete SDK examples from memory.

| Concern | Look here |
| --- | --- |
| Shared contracts | `types/object.ts`, `types/game.ts`, `types/battle.ts` |
| Runtime validation | `lib/validation/schemas.ts` |
| Full screen state + orchestration | `app/page.tsx` |
| Capture UI | `components/CameraUpload.tsx` |
| Browser image normalization | `lib/image/compress.ts` |
| Gemini prompt/transport | `lib/ai/prompts.ts`, `lib/ai/gemini.ts` |
| Server image validation | `lib/ai/imageInput.ts` |
| JSON size limits + friendly errors | `lib/api/http.ts` |
| Perception route | `app/api/object-analysis/route.ts` |
| Character/decision routes | `app/api/character/route.ts`, `app/api/decision/route.ts` |
| Laya HTTP contract | `lib/decision/LayaDecisionEngine.ts` |
| Rule-based fallback | `lib/decision/FallbackDecisionEngine.ts` |
| Automatic fallback orchestration | `lib/decision/DecisionEngineService.ts` |
| Stats/rarity/character creation | `lib/game/statEngine.ts`, `rarity.ts`, `characterEngine.ts` |
| Pure battle state transition | `lib/game/battleEngine.ts`, `typeChart.ts` |
| Offline roster | `lib/game/demo.ts` |
| Reveal/VS/battle/winner UI | Corresponding components in `components/` |
| Design/responsiveness | `app/globals.css` |
| Tests | `tests/ai.test.ts`, `tests/game.test.ts`, `tests/browser/game.spec.ts` |
| Real HTTP checks | `scripts/verify-api.ts`, `scripts/verify-live.ts` |
| Bundled photos and attribution | `public/fighters/` and `CREDITS.md` |

## 7. Stable API contracts

```text
POST /api/object-analysis {image: JPEG/PNG/WebP data URL}
  200 {analysis: ObjectAnalysis}
  422 {rejected:true,rejectionReason:string}
  error {error:string,code:string}

POST /api/decision {analysis: ObjectAnalysis}
  200 {decision: CharacterDecision}

POST /api/character {analysis: ObjectAnalysis,sourceImage:dataURL}
  200 {character: GameCharacter}   (includes trait + Gemini one-liners, generated in parallel with Laya)

POST /api/lore {analysis, spice, owner?, avoid?}   (Lore Pack at capture, 8 s budget, parallel with /api/character)
  200 {lore: LorePack, source: gemini|fallback, jargon: JargonRuleId}   (always 200; canned lore on any failure)

POST /api/reinforcement {image}   (Snap Reinforcement, mid-battle, category only)
  200 {item: heal|shield|energy|trap, objectName}
  422 {rejected:true}

POST /api/arena {image}   (Arena Snap, pre-fight, category only)
  200 {arena: kitchen|desk|outdoors|bedroom|lab|street}
  422 {rejected:true}
```

`analyzeObject(imageDataUrl)` returns ObjectAnalysis or ObjectRejection. Gemini uses interactions API with image input, a single-root JSON envelope schema, `thinking_level:'low'`, `store:false`, a maximum of two attempts, 12 seconds each, SDK retries disabled. The envelope is private to the transport; the public API contracts above are unchanged. Missing key returns a friendly503. Confidence below .55 or unsuitable dominant subject is rejected. Prompt refuses people/faces/unclear/inappropriate images.

Browser compression allows JPG/PNG/WebP up to25MB, decodes orientation, resizes longest side≤1024px, re-encodes JPEG quality .82. Server accepts ≤2MiB decoded bytes, checks magic bytes and bounds actual JSON stream to3MB. HEIC/AVIF are not supported; upload accept list was corrected accordingly. Camera uses capture input with separate upload fallback.

Laya adapter sends `{state,questions}` to `LAYA_ENDPOINT`, appending `/v1/systemone` if endpoint is just an origin. Response is `{answers:{combatClass:{choice:...},primaryType:{choice:...},...}}`, not generated JSON text. Credentials stay server-side. Six categorical questions map into validated CharacterDecision. Invalid response, error or timeout selects deterministic fallback.

`LAYA_TIMEOUT_MS` defaults2500, clamped250–15000 (local CPU laya-serve takes ~4.5–6s per request, so use 12000 locally). `LAYA_MODEL` is documentation/provenance only; model selection occurs on the serving process, not by magically converting a HF model URL into an inference API.

Official setup: https://github.com/NandhaKishorM/laya and https://huggingface.co/convaiinnovations/laya. Basic separate server: `python -m pip install "laya[serve]"`, then `laya-serve`; preloading can be enabled with `$env:LAYA_PRELOAD='1'`. Read current platform docs first. Default preloading can download multiple checkpoints and take time. For hosted endpoints the same typed-decision contract is required. A token alone does not deploy it.

## 8. Game rules and known issues to inspect

> Current rules (blind picks, energy, 12 Signature Traits, Call It, Snap Reinforcement, arenas, Counter-Hunt) and balance data live in `docs/GAME_DESIGN.md`. Latest status is in CHECKPOINTS.md. Some bullets below predate those changes.

- Stats20–100, seven combat classes, six types. Class ranges + categorical tiers + small physical-property modifiers.
- Primary-type advantages: water→heat→nature→electric→water. Metal/chaos neutral. Secondary types are display-only for MVP.
- **Combat is simultaneous blind picks** (redesigned Sept 26; full rules in `docs/GAME_DESIGN.md`). Each round both players secretly pick Strike/Guard/Break/Special via `resolveRound(state, move1, move2)`. Strike>Break>Guard>Strike; Special (3 energy) beats Strike/Break but Guard blocks and counters it. Energy +1/round, +1 for guarding, −2 when a guard is broken; max 5. Match ends at zero HP or 12 rounds (HP ratio, then speed). Input: keys A S D F vs J K L ; or pass-the-phone (default on touch devices).
- Seeded battle reducer is immutable and does not call any AI. HP/logs live in BattleState, not mutated character objects.
- Single hits are capped at 50% of defender maxHP (`HIT_CAP`), covered by a unit test.
- Support class has no healing ability; it is a stat profile. Passive ability names are flavor only and documented as such.
- `goHome()` now cancels battle action timers and outstanding scan requests. Verify navigation during a finishing hit doesn't redirect unexpectedly.
- Main page and CSS contain long lines from initial fast implementation. Formatting with Prettier is fine, but avoid large behavioral rewrites.
- The browser suite passed. A selector collision with Next's own role=alert route announcer was fixed by selecting `.error-box[role=alert]` for product errors. Preserve precise assertions.
- A two-player persisted roster is Zod-validated; storage failures produce a session-only message.
- No environmental combat buffs, hosted deployment, or networking have been added; they are optional scope.

## 9. Next tasks — do in this order

1. Read latest CHECKPOINTS. Preserve the working build and tests. Laya is configured and verified; its four jobs and their measured limits are in [docs/LAYA.md](docs/LAYA.md). Every job falls back to code when Laya is off. On a low-RAM machine, Laya (a few GB) may be stopped by the OS/tooling; restart it with `scripts/start-laya.ps1` only when there is memory to spare.
2. Complete visual review at narrow320px and inspect remaining screenshots. Desktop1440/mobile390 overflow checks, long names, modal Escape, both fixture reveals, persistence, battle, winner, rematch and reset passed. Desktop landing and mobile battle were visually inspected.
3. Keep real Gemini working. `verify:live` checks bottle/laptop and allows an explicit ambiguity rejection for the multi-stapler asset. Obtain a single-stapler photo for a positive test. Diagnostics: `node scripts/check-ai.mjs` checks auth/model availability and a minimal text interaction; `npx.cmd tsx scripts/check-photo.ts` runs real bundled-bottle perception. Never log keys.
4. Re-run the unmocked LIVE Gemini browser test after relevant provider changes. It passed in14.9 seconds on the handoff checkpoint, with fallback decisions. Preserve that actual evidence.
5. Remaining real-image matrix: keyboard, shoe, chair, coffee mug, backpack, plant; dark/unclear/person-dominant/multiple-object photos. Three bundled object samples exist. Fixture rejection tests do not count as real visual-model accuracy checks.
6. Finish concise README / architecture / integration docs, ensure env example matches implementation. Document limitations honestly. Update every checkpoint with actual verified state.
7. Final `npm test`, `npm run typecheck`, `npm run build`, browser checks after changes. Inspect git diff, keep credentials ignored and generated artifacts out of commits. No push.

## 10. Definition of done

Full app starts; real object image compresses and reaches Gemini; valid perception reaches Laya or fallback; both characters reveal; battle changes HP; a winner appears; rematch resets HP/energy; scan-new clears players; explicit offline demo works; invalid/unavailable services show recovery; mobile layout is usable; production build passes.

**Core flow verified: YES, using real Gemini + deterministic Laya fallback.** Actual live Laya inference, the extended real-image matrix and physical camera testing remain outstanding. Do not treat a mocked browser response or prebuilt demo character as real recognition, or infer that all optional integrations were verified.
