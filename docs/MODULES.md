# Reusable module reference

For module selection, example project combinations, and a next-session prompt, start with [HACKATHON_GUIDE.md](../HACKATHON_GUIDE.md).

## Three layers

1. **Logic:** functions under `src/lib` accept data and, where needed, an injected `AIProvider`. Shared data types are in `src/lib/types.ts`; they have no React or Next.js dependency.
2. **HTTP adapter:** `src/app/api/*/route.ts` validates requests, enforces feature gates/limits, selects a provider and invokes logic.
3. **Example interface:** named React exports under `src/features` consume those routes and the shared browser workspace. They are adaptable views, not isolated npm packages.

## Entry points and dependencies

All paths below are relative to the repository root.

| Module    | View                                       | Logic / server adapter                                                                                            | Additional dependencies to retain                                                                                 |
| --------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Chat      | `src/features/chat.tsx` → `Chat`           | `src/app/api/chat/route.ts`; `src/lib/client-api.ts` → `consumeChatStream`                                        | AI provider files, schemas, API helper, workspace store, UI primitives, utils, Lucide                             |
| Agents    | `src/features/agents.tsx` → `Agents`       | `src/lib/runners.ts` → `runAgent`; `src/lib/tools.ts` → `executeTool`, `calculate`; `src/app/api/agents/route.ts` | Knowledge functions, tool ID schema, shared types, injected provider, task hook, RunTrace, UI                     |
| Knowledge | `src/features/knowledge.tsx` → `Knowledge` | `src/lib/knowledge.ts` → `chunkText`, `retrieve`, `extractiveAnswer`; `src/app/api/knowledge/route.ts`            | Shared types; provider only for live synthesis; task hook, workspace, UI                                          |
| Vision    | `src/features/vision.tsx` → `Vision`       | `src/lib/image-validation.ts` → `hasImageSignature`; `src/app/api/vision/route.ts`                                | Node Buffer for signature checking; image schema; provider image capability; Next Image for the example preview   |
| Voice     | `src/features/voice.tsx` → `Voice`         | `src/lib/speech.ts` browser types; `src/app/api/voice/route.ts`                                                   | Browser speech APIs (optional), provider for response generation, task hook, UI                                   |
| Workflows | `src/features/workflows.tsx` → `Workflows` | `src/lib/runners.ts` → `workflowTemplates`, `runWorkflow`; `src/app/api/workflows/route.ts`                       | Injected provider; tool/retrieval files imported by the shared runners file; workflow schema, task hook, RunTrace |
| Analytics | `src/features/analytics.tsx` → `Analytics` | `src/lib/analytics.ts` → `summarizeActivity`, `dailyActivity`                                                     | Shared Activity type, workspace event data, date formatting and JSON export; no AI provider                       |

`src/lib/api.ts` imports the server provider to classify configuration errors. Copying an API route therefore requires the shared server/provider files even when that particular demo response is deterministic. Type-only imports are erased at runtime, but their source paths must resolve during compilation.

## Use logic without the showcase UI

```ts
import { retrieve, extractiveAnswer } from "@/lib/knowledge";
import type { Document } from "@/lib/types";

const sources: Document[] = [
  { id: "policy", title: "Leave policy", content: "Employees receive 20 days of annual leave." },
];
const citations = retrieve("annual leave", sources);
const answer = extractiveAnswer(citations);
```

This is real lexical retrieval and an extractive answer without an API call. It needs the knowledge source file and shared types; it does not need React or the app shell. In another repository, replace the `@/` alias or configure it to match your source root.

```ts
import { runWorkflow } from "@/lib/runners";
import { demoProvider } from "@/lib/ai/demo";

const controller = new AbortController();
const result = await runWorkflow(
  { template: "idea-to-pitch", input: "An assistant for student research notes" },
  demoProvider,
  controller.signal,
);
```

Keep `runners.ts`, `tools.ts`, `knowledge.ts`, `schemas.ts` (tool ID types), `types.ts`, and the AI type/demo files when copying this example. The runner accepts an injected provider; the live adapter itself belongs on a server. Direct logic calls do not perform route validation or HTTP rate limiting; validate inputs and enforce limits in your new adapter.

## Embed a view in an existing Next.js app

```tsx
import { Knowledge } from "@/features/knowledge";
import { WorkspaceProvider } from "@/lib/workspace";

export default function ResearchPage() {
  return (
    <WorkspaceProvider>
      <Knowledge />
    </WorkspaceProvider>
  );
}
```

Keep the corresponding API route, `useTask`, `client-api`, workspace store/types, schemas/API helper/provider, UI components and utils. Import the shared CSS tokens from the host root layout and install the relevant dependencies from `package.json`. You do not need `AppShell` or the starter landing/dashboard. If embedding several views, share one `WorkspaceProvider` above them so state does not reset between routes. Feature views do not independently enforce page flags; your host route must check availability when using the registry.

The example views currently use root-relative `/api/...` endpoints. Update those calls (including `useTask`) when your host app uses a base path or different API location. Change `STORAGE_KEY` in `src/lib/workspace.tsx` if multiple projects share an origin or the stored schema changes.

## Request and result contracts

Every POST uses JSON and accepts `mode: "demo" | "live"` (default `demo`). Schemas in `src/lib/schemas.ts` are authoritative.

| Endpoint         | Other input fields                              | Success response                                           |
| ---------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `/api/chat`      | `messages: { role: "user"                       | "assistant", content: string }[]`                          | NDJSON: text events, then done; failures during streaming use an error event |
| `/api/agents`    | `goal`, `tools: ToolId[]`, optional `documents` | `RunResult`: steps, output, success, provider              |
| `/api/knowledge` | `query`, `documents: Document[]`                | output, citations, provider                                |
| `/api/vision`    | `prompt`, `image: { mediaType, data }`          | output, provider; data is base64 without a data-URL prefix |
| `/api/voice`     | `prompt` (edited transcript or typed text)      | output, provider                                           |
| `/api/workflows` | `template: "idea-to-pitch"                      | "review-and-improve"`, `input`                             | RunResult after the complete sequence finishes                               |

Pre-stream HTTP failures return `{ error: string }` with an error status. A completed HTTP agent request can still have `success: false` after a tool failure; inspect the result, not only status 200. `/api/status` is a GET returning configuration availability without a credential value.

## Common extension points

- **New module:** registry in `src/config/features.ts`; icon map in `src/components/icons.tsx`; view mapping in `src/app/(workspace)/[module]/page.tsx`; view, optional schema/route/logic; tests and docs. Browser-only modules do not require invented AI endpoints.
- **New tool:** tool ID allowlist in `src/lib/schemas.ts`; definition and implementation in `src/lib/tools.ts`. Preserve bounded execution. External tools need their own validation, authorization and timeouts.
- **New workflow:** update the workflow schema, template list, runner sequence, view’s template ID typing, demo behavior, and tests together. Currently the runner has a fixed two-template union.
- **New provider:** implement `AIProvider` and update its ID union, server factory/status, environment template, Settings and provider labels in views. The current UI supports Demo and one configured live adapter; it has no multi-provider selector.
- **New data model:** extend shared types, server schemas, and the browser storage schema together. Version/migrate stored data explicitly. Keep original unreadable storage until the user resets it.

## UI and motion

Semantic tokens live in `src/app/globals.css`. The shell and feature views use a neutral light palette, open sections and dividers. `Card` is a lightweight grouping primitive without default border/background; apply an explicit surface only when content needs it. Buttons are rounded and fields retain visible boundaries.

Reusable motion classes: `page-enter` for route entry, `stagger-in` for short lists, `result-enter` for results, `bar-enter` for analytics bars. Hover/press feedback is brief; `prefers-reduced-motion` disables movement. Route entry is keyed by pathname inside AppShell, so the animation also runs on navigation. Avoid adding decorative looping motion or wrapping every section in a card.
