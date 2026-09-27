# Object Arena architecture

```text
Camera / file upload
  -> lib/image/compress.ts (browser; orientation, <=1024px JPEG)
  -> POST /api/object-analysis
  -> Gemini perception + Zod validation
  -> ObjectAnalysis
  -> POST /api/character
  -> DecisionEngineService -> LayaProfileEngine (rules + Laya element/stat nudges) or FallbackDecisionEngine
  -> CharacterDecision
  -> characterEngine + statEngine + rarity
  -> GameCharacter
  -> BattleEngine or another feature
```

`types/object.ts`, `types/game.ts`, and `types/battle.ts` are the shared contracts. Runtime schemas live in `lib/validation/schemas.ts`. Game mechanics never consume unvalidated model prose.

Gemini sees a normalized photo and produces object properties and playful identity text. It never assigns numerical combat stats or winners. Rejections and provider failures have explicit UI states; a failed scan never silently becomes a fabricated object.

Laya answers typed questions (choice / score / yes-no) through its real `/v1/systemone` HTTP server (`lib/decision/layaClient.ts`). It decides the element (when confident) and bounded stat nudges, referees reinforcement and arena categories from Gemini's description, adds a per-line safety check to lore, and predicts the human's next move in solo mode. Every use bounds its wait and falls back to deterministic rules. Details and measurements: `docs/LAYA.md`. A model identifier alone is not an HTTP inference endpoint. Configure a running Laya service to use real inference.

Character generation converts class/tier decisions into bounded 20–100 stats. Rarity is cosmetic. The battle engine (`resolveRound`) resolves simultaneous blind picks (Strike/Guard/Break/Special) through a fixed counter table with an energy economy, seeded variation and type relationships. See `docs/GAME_DESIGN.md`. There are no AI calls during combat.

The presentation owns local players, capture/reveal/versus/battle/winner transitions and localStorage. Core game modules have no React or Next.js dependency. Secrets only exist in server environment variables.

## Team ownership

| Area | Files |
| --- | --- |
| Perception | `lib/ai`, `lib/api`, `app/api/object-analysis` |
| Decisions and combat | `lib/decision`, `lib/game` |
| Presentation | `components`, `app/page.tsx`, `app/globals.css` |
| Integration | `types`, `lib/validation`, `lib/image`, API orchestration, tests and configuration |

Local multiplayer shares one device. No authentication, database or real-time service is required. The original repository remains a separate worktree on `main`.
