# Architecture

## Request flow

A client feature gathers input and current mode. `useTask` sends a cancellable JSON POST and records real activity. Chat instead consumes the shared NDJSON stream (`text`, `done`, `error`). Server routes call `readRequest` for feature gating, same-origin checks, request budget, streaming body-size enforcement and Zod validation, then choose a provider.

`AIProvider` supports `complete` and `stream`, optional image input, and AbortSignal. `getProvider` is server-only and constructs the Anthropic SDK only when live use is explicitly enabled. It uses a 25-second request timeout, no retries, and a 1,400-token output budget. Chat has a 30-second overall deadline; workflows have an 85-second deadline. Credentials and SDK error payloads never flow to the browser. Public error messages preserve actionable configuration errors and hide transport internals.

## Tools and execution

Agents run the user-selected tools in order (deduplicated, at most three), then request synthesis. This is a bounded tool pipeline, not autonomous tool selection or hidden model reasoning. Arithmetic uses a recursive descent parser; no eval, shell, filesystem, or arbitrary URL tools exist. A failed tool stops execution with a failed trace.

Workflow templates choose a fixed two- or three-step sequence. Every step receives original input and previous output. Cancellation propagates through fetch to provider requests. Workflow results are returned after all steps finish; intermediate results are not streamed. A provider failure aborts the request and the UI offers retry.

## Retrieval

Text sources split into 120-word chunks with 25-word overlap. Keyword coverage, bounded term frequency and title matches determine ordering. The best four positive matches become source citations. Demo answers quote those chunks. Live synthesis is instructed to use only those passages and cite their indices. Source text is untrusted data; prompt instructions are not treated as app authority. As with any generated answer, source-grounding prompts do not prove factual accuracy.

## Client data

`WorkspaceProvider` uses useSyncExternalStore to hydrate a versioned, schema-validated store and persists bounded updates. Failed storage writes retain session data; unreadable original data stays untouched until an explicit reset. Framework-independent data contracts live in `src/lib/types.ts` and are re-exported by the workspace module for compatibility. Documents and conversations are personal to this browser; there is no server database, authentication, shared workspace or cross-tab merge. Image previews are data URLs held only in component state. Speech uses browser recognition/synthesis with explicit user action and text fallback.

Analytics contain actual app run metadata, never prompt contents. Workflows count as one workspace run, not individual billable API calls. Durations include browser/network time; demo times are real measured times for deterministic computation. Failed and cancelled operations are recorded as unsuccessful.

## Feature flags and routing

The central registry drives navigation and maps module IDs to client views through `src/app/(workspace)/[module]/page.tsx`. Unknown or disabled pages return 404. Each corresponding API route independently checks availability. `NEXT_PUBLIC_DISABLED_FEATURES` is a build-time public environment setting; rebuild to change it in production. Settings and dashboard remain available.

## UI contract

Semantic CSS variables live in globals.css. Reusable components in `src/components/ui` provide buttons, content groups, badges, fields, results, and standard states. Card is a plain group without an automatic border/background; open sections and thin dividers are the default. Brand is a separate server-compatible component. Feature views own form state; the workspace provider owns persisted data. User/model output renders as plain text, never raw HTML.

AppShell keys its inner page by pathname for entry motion. Shared CSS supplies finite stagger/result/bar animations and hover/press feedback; reduced-motion preferences disable transforms and transitions. The mobile drawer manages focus and Escape, and is hidden from keyboard navigation when closed. Use existing tokens and components when extending the app.

## Module reuse

See [MODULES.md](MODULES.md) for logic/view/API boundaries and dependencies, and [HACKATHON_GUIDE.md](../HACKATHON_GUIDE.md) for choosing modules from a brief. The app demonstrates independent modules; a product combining them needs explicit orchestration and data contracts. Shared types have no UI dependency. The provider factory and request guard are server-only; keep them out of client bundles.

## Acceptance and recovery

PROJECT_STATUS.md is authoritative. RESUME.md points new sessions there. CLAUDE.md records conventions. Keep all three consistent after meaningful work. Quality checks do not need a localhost server. Stage 1's pre-localhost gate is historical once the baseline is complete; continue authorized user iterations in the active phase. No cloud publishing is implied. Distinguish mocked tests, HTTP checks, browser review and real provider calls when reporting results.
