# Integrating another hackathon idea

Consume either stable boundary without importing the game UI or starting a battle.

## Perception only (server)

```ts
import { analyzeObject } from '@/lib/ai/gemini';

const analysis = await analyzeObject(imageDataUrl);
if ('rejected' in analysis && analysis.rejected) {
  // Ask for a clearer object image.
} else {
  futureFeature.consume(analysis);
}
```

The HTTP equivalent is `POST /api/object-analysis` with `{image: imageDataUrl}`. A successful response contains `{analysis}`. Rejected images return HTTP 422 with `{rejected:true,rejectionReason}`. Provider failures return a friendly `{error,code}` response.

## Reusable character (server)

```ts
import { classifyCharacter } from '@/lib/decision/DecisionEngineService';
import { createCharacter } from '@/lib/game/characterEngine';

const decision = await classifyCharacter(analysis);
const character = createCharacter(analysis, decision, imageDataUrl, 'gemini');
futureFeature.consume(character);
```

The HTTP equivalent is `POST /api/character` with `{analysis,sourceImage:imageDataUrl}`, returning `{character}`. `POST /api/decision` with `{analysis}` exposes just `{decision}`.

## Optional combat (browser or server)

```ts
import { createBattle, resolveRound } from '@/lib/game/battleEngine';

let battle = createBattle(characterA, characterB, 42);
battle = resolveRound(battle, 'strike', 'guard'); // both players' secret picks
```

No other feature must import the battle module. Inventory, scavenger hunts or education modes can use `ObjectAnalysis` or `GameCharacter` directly.

Safe pure modules: `lib/game/statEngine`, `typeChart`, `rarity`, `characterEngine`, `battleEngine`, `types/*`. Keep `lib/ai`, the Laya HTTP adapter and its service on the server because they access private credentials. `lib/image/compress` requires a browser DOM. Validate persisted/network entities with the central Zod schemas.
