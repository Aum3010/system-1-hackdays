# Launchpad project instructions

Read PROJECT_STATUS.md before work and continue its Next Exact Task. Read RESUME.md for recovery rules.

For a new hackathon brief, read [HACKATHON_GUIDE.md](HACKATHON_GUIDE.md) and [docs/MODULES.md](docs/MODULES.md). Select existing modules before proposing new infrastructure. The brief and latest user request define the goal.

## Build contract

- Build directly in this root. Next.js App Router + React + strict TypeScript + pnpm.
- Stage 1: finish functionality and run install, lint, typecheck, tests, production build before starting localhost. Do not iterate visually until the user reviews it.
- Stage 1 is complete. On 2026-09-16 the user authorized Stage 2: simplify the UI, add subtle animations, improve reuse guidance, and review all project Markdown/skills. Continue that work without asking for the same approval. For future requests, use the current checkpoint and latest user direction.
- Update PROJECT_STATUS.md after each major phase. Record actual check results, problems, and exact next work.
- Never overwrite unrelated user work, commit secrets, rewrite history, or push without instruction.

## Architecture

- src/app: routing and API boundaries. src/features: client module views.
- src/components/ui: reusable primitives; globals.css: semantic tokens; components.json: shadcn configuration.
- src/config/features.ts: central registry. Disabled features must be blocked in UI and routes.
- src/lib/ai: provider-neutral contract, deterministic demo provider, server-only live provider.
- src/lib: retrieval, tools, agent/workflow runners, request validation, browser workspace persistence.
- src/lib/types.ts: shared data contracts without React/Next.js dependencies. Existing workspace type re-exports remain compatible.
- Credentials exist only in server environment variables. Demo never requires credentials; live requests must be explicitly enabled.
- Browser-local data is versioned and bounded. No production authentication/database is included.
- Knowledge uses lexical chunk retrieval with source citations. Vision fixtures and browser speech limitations must be labeled honestly.
- Modules are independent examples. Chat does not consume Knowledge and Vision does not invoke Workflows automatically; wire data contracts explicitly when combining them.

## UI direction

- Neutral light background, charcoal text, ample whitespace, open sections and thin dividers. Avoid decorative colored banners, repeated card grids and promotional copy.
- Reuse semantic CSS tokens and existing controls. Card is a plain content group by default; add a bounded surface only when needed.
- Use short page/list/result transitions and small interaction feedback. Keep prefers-reduced-motion support. Avoid decorative looping animations.
- Preserve responsive layout, visible focus, form labels, and the mobile drawer's Escape/focus behavior. Browser verification is distinct from HTTP checks.

## Commands

pnpm install; pnpm verify; pnpm format:check. Individual checks: lint, typecheck, test, build, check:repo, check:docs. Use pnpm dev for the already-completed baseline and authorized iterations. If pnpm is unavailable, use npx --yes pnpm@10.30.0. Do not run type generation and build concurrently.

## Team system

Project skills live in .claude/skills: start-hackathon, resume-build, add-feature, add-provider, verify-baseline. Role definitions live in .claude/agents: architect (read-only planning), frontend-builder (views/UI), ai-engineer (providers/server/logic), quality-reviewer (review-only checks). The coordinating session integrates changes and updates checkpoints; use bounded assignments when delegation is requested. See [docs/CLAUDE_WORKFLOWS.md](docs/CLAUDE_WORKFLOWS.md) for usage and review scenarios, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for internals, and [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md) for app exercises.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
