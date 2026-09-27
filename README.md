# Object Arena

**Snap it. Spawn it. Battle it.** Two players photograph everyday objects, Gemini recognizes them, Laya (or a built-in rule engine) decides how each object fights, and the app runs a local turn-based battle.

```
photo → browser compression → Gemini (ObjectAnalysis) → Laya or fallback (CharacterDecision)
      → character engine (GameCharacter) → battle engine → winner
```

Everything runs on one device: no accounts, database or networking.

**How a battle works:** each round both players secretly pick **Strike**, **Guard**, **Break** or **Special** at the same time, using keys `A S D F` vs `J K L ;` or pass-the-phone.
- Strike beats Break, Break smashes Guard, and Guard blocks and counters Strike.
- Special costs 3 energy and crushes Strike and Break, but a Guard shuts it down.

Reading your opponent beats spamming any one move.

**What makes each object different:**
- **Signature Trait:** every fighter bends one rule. Scissors Pierce guards, a laptop starts Charged, a mug Scalds.
- **Call It:** once per match, predict your rival's move.
- **Snap Reinforcement:** once per match, photograph a nearby item mid-fight.
- **Arena Snap:** photograph your surroundings to boost one element.
- **Counter-Hunt:** Player 2 races the clock to find a counter-object.

Full rules and balance data: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md).

---

## Quick start (new machine)

### 1. Prerequisites

| Tool | Version | Needed for |
| --- | --- | --- |
| Git | any | cloning |
| Node.js | 22+ (tested 22.11) | the app |
| npm | comes with Node | dependencies |
| Python | 3.10+ (tested 3.12) | **optional** local Laya server |
| Gemini API key | [Google AI Studio](https://aistudio.google.com/apikey) | real photo recognition |

Disk: ~500 MB for `node_modules`, plus ~2.5 GB (PyTorch + model) if you run Laya locally.

### 2. Get the code

```bash
git clone https://github.com/Aum3010/system-1-hackdays.git
cd system-1-hackdays
git checkout new-work          # all application code lives on this branch
```

Already cloned? Run `git fetch origin` and then `git checkout new-work && git pull`.

### 3. Install and configure

```bash
npm install
```

Copy the env template and add your own Gemini key. Never commit `.env.local`; it is git-ignored.

```bash
# macOS / Linux
cp .env.example .env.local
# Windows PowerShell
Copy-Item .env.example .env.local
```

Open `.env.local` and set at least:

```ini
GEMINI_API_KEY=your-key-here
```

Leave `LAYA_ENDPOINT` blank for now. The app then uses the deterministic fallback, which works fine for development.

### 4. Run

```bash
npm run dev
```

Open **http://127.0.0.1:3000**.

- **Use demo fighters** works with no API keys at all.
- Photograph or upload two objects to use the live pipeline (needs `GEMINI_API_KEY`).

> Windows note: if PowerShell blocks `npm` with an execution-policy error, use `npm.cmd` / `npx.cmd` instead.

---

## Laya decision server (optional)

Laya is a typed-decision model ([model card](https://huggingface.co/convaiinnovations/laya), [repo](https://github.com/NandhaKishorM/laya)). It answers typed questions with calibrated confidence and never writes text. In this game it has four jobs: each fighter's element and stat nudges, the category for Snap Reinforcement and Arena Snap, a per-line safety check on generated lore, and predicting your next move in solo mode. [docs/LAYA.md](docs/LAYA.md) explains each job and what was measured.

- **Snippets that won't work:** the Hugging Face "Use this model" snippets (`transformers.pipeline(...)`, `AutoModel.from_pretrained(...)`) do not work for Laya.
- **What it needs instead:** its own `laya` package, run as a local HTTP server.
- **If it isn't running:** the app silently falls back to the built-in rules.

### Install (once per machine)

**Windows (PowerShell)**

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements-laya.txt
```

**macOS / Linux**

```bash
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements-laya.txt
```

`.venv/` is git-ignored. The install pulls in PyTorch (CPU build by default). For an NVIDIA GPU on Windows or Linux, install CUDA PyTorch first by following [pytorch.org](https://pytorch.org/get-started/locally/).

### Start it (keep this terminal open)

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File scripts\start-laya.ps1
```

```bash
# macOS / Linux
./scripts/start-laya.sh
```

- **First run:** downloads the English checkpoint (~1.5 GB, about a minute on a fast connection) into `~/.cache/huggingface`. Later starts only load it from disk.
- **Ready check:** the server is ready when it prints `Uvicorn running on http://127.0.0.1:8000`.
- **Faster devices:** set `LAYA_DEVICE=cuda` (NVIDIA) or `LAYA_DEVICE=mps` (Apple Silicon) before starting. The default is `cpu`.

### Point the app at it

In `.env.local`:

```ini
LAYA_ENDPOINT=http://127.0.0.1:8000
LAYA_TIMEOUT_MS=12000
```

On CPU, a fighter's profile takes about 3–5 s, hence the 12 s timeout. With a GPU you can lower it to ~2500. The other Laya jobs use their own fixed budgets (see [docs/LAYA.md](docs/LAYA.md)). Restart `npm run dev` if it doesn't pick up the change.

### Confirm Laya is really being used

With both servers running:

```bash
npm run verify:live
```

Each line should end with `decisionProvider=laya`. If it says `fallback`, Laya is unreachable or too slow; check the Laya terminal and `LAYA_TIMEOUT_MS`.

---

## Configuration reference

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Required for real photo recognition. Server-only |
| `GEMINI_MODEL` | Defaults to `gemini-3.8-flash`. Verify your account has access |
| `LAYA_ENDPOINT` | Laya server origin (e.g. `http://127.0.0.1:8000`) or full `/v1/systemone` URL. Blank = fallback |
| `LAYA_TIMEOUT_MS` | Fighter-profile budget. Default 2500. Allowed range 250–30000. Use ~12000 for CPU Laya |
| `LAYA_API_KEY` | Only if your Laya server was started with `LAYA_API_KEY` (bearer auth) |
| `HUGGINGFACE_API_TOKEN` | Alternative bearer token for a hosted Laya service |
| `LAYA_MODEL` | Provenance only. The checkpoint is chosen by the Laya server |

---

## Tests and verification

```bash
npm test                 # unit + route-handler tests (no network)
npm run typecheck
npm run build

# These need `npm run dev` running:
npm run verify:api       # HTTP checks with fixture data
npm run verify:live      # real Gemini (+ Laya if configured) on bundled photos
npx playwright install chromium   # once per machine
npx playwright test      # offline/fixture browser flow + base-UI screenshot check
npx tsx scripts/simulate.ts   # balance report (strategies and traits)
```

To run the live browser test against real Gemini:

```bash
# macOS / Linux
LIVE_AI=1 npx playwright test --grep "LIVE Gemini"
# Windows PowerShell
$env:LIVE_AI='1'; npx.cmd playwright test --grep 'LIVE Gemini'; Remove-Item Env:LIVE_AI
```

Fixture tests are not proof of provider accuracy. Latest verified results are in [CHECKPOINTS.md](CHECKPOINTS.md).

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Scans fail with "service unavailable" | `GEMINI_API_KEY` is missing or invalid in `.env.local`. Run `node scripts/check-ai.mjs` |
| Stapler sample is rejected | Expected: the photo contains three staplers. Use a photo with one object |
| `decisionProvider=fallback` with Laya configured | Laya server isn't running, or `LAYA_TIMEOUT_MS` is too low for CPU |
| Port 3000 or 8000 already in use | Another dev/Laya server is running. Stop it or reuse it |
| HEIC/AVIF upload rejected | Not supported. Use JPG, PNG or WebP |
| Hugging Face symlink warning on Windows | Harmless. The model still caches correctly |

---

## Contributing

- Work on `new-work`, or branch from it: `git checkout -b my-feature new-work`.
- Before pushing, run `npm test && npm run typecheck && npm run build`.
- Never commit `.env.local`, `.venv/`, `.next/`, `node_modules/` or `test-results/`. All are git-ignored.
- This project uses **Next.js 16**, which has breaking changes. Read [AGENTS.md](AGENTS.md) and the guides in `node_modules/next/dist/docs/` before changing framework code.
- **Base UI is frozen.** `tests/browser/visual.spec.ts` pixel-compares the landing and capture screens against saved baselines.
  - Animation goes in `app/animations.css` and `components/fx/*` as an additive layer.
  - If you change those screens on purpose, regenerate the baselines with `npx playwright test visual --update-snapshots`.
- Keep AI out of numeric stats and combat. Gemini describes, Laya/fallback categorizes, and app code owns the numbers. Laya's stat nudges are bounded to ±8 in code.

### Where things live

| Concern | Files |
| --- | --- |
| Shared types / validation | `types/*`, `lib/validation/schemas.ts` |
| Screen flow | `app/page.tsx`, `components/*`, `app/globals.css` |
| Gemini | `lib/ai/*`, `app/api/object-analysis/route.ts` |
| Laya + fallback | `lib/decision/*` (`layaClient`, `LayaProfileEngine`, `layaScenes`, `layaBot`), `lib/ai/layaSafety.ts`, `app/api/decision`, `app/api/bot-move`, [docs/LAYA.md](docs/LAYA.md) |
| Solo mode (vs Laya) | `lib/game/bot.ts`, `components/BattleArena.tsx` (`bot` prop), `scripts/bot-eval.ts` |
| Stats, characters, battle | `lib/game/*`, `app/api/character/route.ts`, [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) |
| Animation layer | `lib/fx/timeline.ts`, `hooks/useBattleTimeline.ts`, `hooks/useFxSettings.ts`, `components/fx/*`, `app/animations.css` |
| Item and arena photos | `lib/ai/scenes.ts`, `app/api/reinforcement`, `app/api/arena` |
| Flavor text ("unhinged corporate" narrator) | `lib/ai/persona.ts`, `lib/ai/structured.ts` (validate, retry once, fall back), `lib/ai/safety.ts`, `lib/ai/fallbackLore.ts`, `lib/ai/lore.ts`, `app/api/lore`, `lib/fx/announcer.ts` |
| Tests | `tests/*.test.ts`, `tests/browser/*`, `scripts/verify-*.ts` |

More detail:

- [ARCHITECTURE.md](ARCHITECTURE.md): module boundaries.
- [INTEGRATION.md](INTEGRATION.md): reuse perception or characters without the battle.
- [HANDOFF.md](HANDOFF.md) / [CHECKPOINTS.md](CHECKPOINTS.md): detailed status, known issues and next tasks.
