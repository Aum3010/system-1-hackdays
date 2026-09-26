---
name: verify-baseline
description: Verify Launchpad technical acceptance or a completed iteration, record actual results, and prepare the current build for local review.
---

Read PROJECT_STATUS.md and package.json. `pnpm verify` runs lint, typecheck, tests, build, repository audit and documentation checks; run `pnpm format:check` as well. If pnpm is unavailable, substitute `npx --yes pnpm@10.30.0`. Resolve technical failures and rerun affected checks. Do not run next typegen and next build concurrently because both generate route types.

Verify `.env.example`, README.md, CLAUDE.md, PROJECT_STATUS.md, RESUME.md, HACKATHON_GUIDE.md, docs/MODULES.md, `.claude/skills`, `.claude/agents`, and the feature registry. Inspect Git status if a repository exists; ensure no secrets or unintended nested app were added. Automated scans have limited patterns and are not a complete secret audit.

Record exact results and material limitations in PROJECT_STATUS.md for the active phase. Never claim live-provider or browser validation from mocked tests or HTTP status checks. Reuse an existing local server when it serves this project; otherwise start `pnpm dev` after the initial baseline gate, verify HTTP responses and leave it running when supported. For authorized UI work, inspect desktop/mobile behavior and reduced motion when browser access is available; report unavailable checks clearly.

Hand off the completed request for review. This skill does not independently initiate another redesign, publish, push, or change external accounts; it does not cancel work already authorized by the user.
