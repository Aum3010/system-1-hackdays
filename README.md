# Launchpad

A modular AI hackathon starter built with Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn-compatible UI primitives. Start with a complete local workspace and replace the demo behavior as your idea takes shape.

**Using this at a hackathon?** Read [HACKATHON_GUIDE.md](HACKATHON_GUIDE.md) for module selection, project recipes, and a prompt for your next LLM session. [docs/MODULES.md](docs/MODULES.md) maps reusable functions, views, API contracts, and their dependencies.

## Start here

Requires Node.js 22.11+ and pnpm 10.30.0. Install pnpm with your preferred package-manager setup, or substitute `npx --yes pnpm@10.30.0` for `pnpm` in the commands below.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Open http://localhost:3000. The dev server binds to loopback. Next.js selects another port if 3000 is occupied. No `.env.local`, account, database, or paid credentials are needed for Demo Mode.

The initial baseline is complete, and the user authorized the current UI and documentation iteration. Read [PROJECT_STATUS.md](PROJECT_STATUS.md) for current results and unfinished work. To recover an interrupted session, start with [RESUME.md](RESUME.md). Historical verification results are not a substitute for checking changed code.

## What’s included

| Page         | Working baseline                                                                        |
| ------------ | --------------------------------------------------------------------------------------- |
| `/`          | Landing page and module navigation                                                      |
| `/dashboard` | Open module directory, workspace counts, actual run activity                            |
| `/chat`      | Streaming conversation, stop, new chat, JSON export, local history                      |
| `/agents`    | Selected tool execution, calculator, text statistics, knowledge search, synthesis trace |
| `/knowledge` | Paste/import text or Markdown, sample source, removal, chunk retrieval and citations    |
| `/vision`    | Image upload/preview, validated image input, demo fixture or live analysis              |
| `/voice`     | Browser speech recognition, editable transcript, typed fallback, read-aloud             |
| `/workflows` | Idea-to-pitch and review/improve templates with sequential step outputs                 |
| `/analytics` | Actual run counts, success rate, durations, daily activity, filtering/export            |
| `/settings`  | Demo/live selection, provider status, feature availability, export/reset                |

## Demo versus live

Demo chat and synthesis use deterministic templates; they are not an offline language model. Agent tools execute real local operations. Knowledge returns exact matching passages using lexical retrieval, not embeddings. Demo vision demonstrates the request/result flow and does **not** interpret the image. Voice uses browser speech services, which may require network access even in Demo Mode; typing always works.

To use Anthropic:

1. Copy `.env.example` to `.env.local`.
2. Set `ANTHROPIC_API_KEY` and `ENABLE_LIVE_AI=true`.
3. Optionally set `ANTHROPIC_MODEL` to a model available to your account.
4. Restart the server and choose **Live Mode** in Settings.

Keys never enter browser state or responses. Settings checks configuration presence, not credential validity. A failed live request returns an error; it never silently falls back to demo. A live workflow makes up to three model calls. Tests use mocks and do not incur provider charges.

The provider contract supports complete responses, streaming text, and image input. Add another adapter using `.claude/skills/add-provider/SKILL.md`. See the [official Anthropic SDK documentation](https://platform.claude.com/docs/en/cli-sdks-libraries/overview) and [vision API guide](https://platform.claude.com/docs/en/build-with-claude/vision) for provider integration details.

## Feature configuration

`src/config/features.ts` is the single registry for navigation, landing/dashboard links, and page availability. Disable modules with a comma-separated environment variable:

```dotenv
NEXT_PUBLIC_DISABLED_FEATURES=vision,voice
```

Restart development or rebuild production after changing this variable. API routes independently enforce the same gates. Feature IDs: `chat`, `agents`, `knowledge`, `vision`, `voice`, `workflows`, `analytics`.

## Data and limits

- Browser local storage holds one conversation (last 100 messages), up to 20 sources (30,000 characters each), and the last 200 activity events.
- Only the last 30 chat messages, each capped at 10,000 characters, are sent as model context.
- Images are limited to 4 MB and are not persisted. Audio is not recorded by this app.
- Knowledge retrieval sends only matching source excerpts to the live provider. Agents send the selected tool results for synthesis.
- Export workspace JSON in Settings. Reset requires a second confirmation. This baseline exports backups but does not provide a backup import UI.
- Data is specific to a browser profile and origin. A different localhost port has different browser storage. Multiple tabs are not synchronized.
- No fake usage numbers, token counts, or cost estimates are shown.

## Architecture and development

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md), and [CLAUDE.md](CLAUDE.md).

Use the entire starter, embed selected views under a shared WorkspaceProvider, or reuse the underlying logic with your own UI. These are source modules, not published packages; copying a view also requires its hooks, components and API dependencies. Modules are not automatically connected to each other. [MODULES.md](docs/MODULES.md) provides exact integration guidance.

```text
src/
  app/                 Pages, root layout, and server API routes
  components/          App shell, icons, UI primitives, execution trace
  config/features.ts   Feature registry and availability
  features/            Module client views
  hooks/use-task.ts    Cancellable JSON requests and run tracking
  lib/ai/              Provider interface, demo and Anthropic adapters
  lib/types.ts         Framework-independent data contracts
  lib/                 Validation, retrieval, tools, runners, browser state
tests/                 Core behavior, API and provider transport tests
.claude/skills/        Hackathon selection, recovery, development, verification
.claude/agents/        Architect, frontend builder, AI engineer, reviewer
```

The UI uses a neutral light palette, generous spacing, open sections, and thin dividers. Shared CSS supplies subtle route, list, result, hover and press animations with reduced-motion support. CSS variables, Tailwind 4, Radix Slot and class-variance-authority keep controls reusable. `components.json` supports adding shadcn components; existing primitives are intentionally adapted to this layout. No remote fonts or image downloads are needed at runtime.

## Quality commands

```bash
pnpm lint          # ESLint, zero warnings
pnpm typecheck     # Generate route types, then strict TypeScript
pnpm test          # Vitest, no server or credentials required
pnpm build         # Production compilation and route generation
pnpm check:repo    # Required files, nested app, accidental secret-file audit
pnpm check:docs    # Project Markdown links, skill and agent structure
pnpm format:check  # Check consistent source formatting (pnpm format to apply)
pnpm verify        # Combined quality gate
```

## Claude Code team

Project skills: `/start-hackathon`, `/resume-build`, `/add-feature`, `/add-provider`, `/verify-baseline`. Project subagents: `architect`, `frontend-builder`, `ai-engineer`, `quality-reviewer`. Open Claude Code from this repository root so it discovers the project definitions. See [docs/CLAUDE_WORKFLOWS.md](docs/CLAUDE_WORKFLOWS.md) for example requests, role boundaries and skill review scenarios.

The primary session owns integration and checkpoints. These files do not require experimental agent-team mode or override your tool permissions. Their layout follows the [official skills](https://code.claude.com/docs/en/skills) and [subagent documentation](https://code.claude.com/docs/en/sub-agents). Static validation checks structure and paths; it does not prove every possible model behavior.

## Scope before public hosting

This is a local hackathon baseline, not a hosted multi-user service. Add authentication, per-user storage, distributed quotas, and deployment-specific origin/proxy handling before exposing paid provider routes publicly. The built-in 60-request/minute budget is process-local and shared across modules; it is not a distributed rate limiter. Deployment and paid credential testing are outside this initial build.

## Troubleshooting

- **pnpm not found:** use `npx --yes pnpm@10.30.0 install` and `npx --yes pnpm@10.30.0 dev`.
- **Windows EPERM during Node commands:** the coding sandbox may need approval to run the command outside its filesystem restriction.
- **Live unavailable:** check `.env.local`, restart the server, recheck Settings, then select Live Mode. API errors can also mean an invalid key, model, quota, or provider outage.
- **Microphone unavailable:** browser support varies. Use the transcript field; localhost/secure contexts are required for microphone access.
- **No knowledge matches:** add a source and ask using a term present in it. Load the sample guide for an immediate example.
- **Storage unavailable:** the app keeps session data in memory and shows a warning. Export before closing the tab.
