---
name: add-feature
description: Add or extend a Launchpad feature module with its UI, validated API boundary, Demo Mode, and registry entry.
---

Read `PROJECT_STATUS.md`, `CLAUDE.md`, `docs/MODULES.md`, `src/config/features.ts`, and the closest existing module before implementing the requested feature. Resolve source paths from the repository root.

- For a new module, register availability in `src/config/features.ts`, its icon in `src/components/icons.tsx`, and its view in `src/app/(workspace)/[module]/page.tsx`. An extension to an existing module usually keeps its existing entry.
- Put the client view in `src/features`, reusable logic in `src/lib`, and shared data contracts in `src/lib/types.ts`. Add a server route under `src/app/api` only if the feature needs one. Use existing UI primitives and semantic tokens.
- Validate server inputs with `src/lib/schemas.ts` and `readRequest`. Keep the page and API feature gates consistent.
- Use `useTask` for a cancellable JSON operation or the chat stream contract for streaming. Handle loading, empty, error, and success states.
- Provide honest credential-free Demo Mode. Record bounded activity with mode, duration, and actual outcome; do not fabricate analytics.
- Test meaningful logic and failure boundaries; use lint/typecheck/build and available browser checks for presentation changes without adding tests that merely copy styling. Update module docs and PROJECT_STATUS.md with actual results.

Keep logic callable without the demo UI where practical. Preserve the existing provider layer, persistence store, and app shell unless the user requests a structural change. Current UI defaults are neutral colors, open sections, whitespace, and restrained motion with reduced-motion support.

Stage 1's pre-localhost gate applies only while building the initial baseline. Once the user requests UI iteration or a new hackathon implementation, proceed in the active phase; do not ask for the same authorization again. Use HACKATHON_GUIDE.md when the task needs module selection for a brief.
