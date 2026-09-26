# Use Launchpad at your hackathon

Start here when you have a hackathon brief and need to turn this starter into a project. This is a working collection of reusable modules with a demo application around them. Choose the pieces that serve your idea.

For an interrupted coding task, read [RESUME.md](RESUME.md) and [PROJECT_STATUS.md](PROJECT_STATUS.md) first. For file paths, function contracts, and extraction dependencies, use [the module reference](docs/MODULES.md).

## Paste this into your next LLM session

```text
We are using the existing Launchpad hackathon starter in this repository.
Read RESUME.md, PROJECT_STATUS.md, CLAUDE.md, HACKATHON_GUIDE.md,
and docs/MODULES.md. Inspect the current code and Git status if available.
Do not reinitialize the project or redo completed starter work.

Hackathon brief: [paste the actual problem statement]
Target user and their main problem: [describe]
Judging criteria / required sponsor technology: [paste]
Time remaining and team size: [describe]
Available data, APIs, and credentials: [names only; never paste keys]
Required demo outcome: [one observable result]

Select the smallest useful set of existing modules. Tell me which ones you
will reuse, what needs to change, what is missing, and how you will demonstrate
success. Then implement that end-to-end journey. Ask only for missing choices
that materially affect the result; otherwise state reasonable assumptions.
Preserve Demo Mode as a clearly labeled fallback. Keep the neutral, spacious
UI with restrained motion. Update PROJECT_STATUS.md after coherent milestones
with decisions, actual check results, and the next exact task.
```

Replace the bracketed brief fields. If you only want an initial plan, replace “Then implement” with “Stop after the implementation plan.” In Claude Code, `/start-hackathon` follows this same guide; any coding LLM can read this file directly.

## Which module should I use?

| Your core task                                                 | Start with | Add only when needed                 | Important boundary                                                                                                        |
| -------------------------------------------------------------- | ---------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Conversational helper, coach, brainstorming assistant          | Chat       | Voice for spoken interaction         | Demo replies are templates; useful open-ended generation needs live AI.                                                   |
| Answer questions from policies, notes, study material, or FAQs | Knowledge  | Chat for follow-up conversation      | Chat is not connected to Knowledge automatically. Connect retrieval explicitly if combining them.                         |
| Calculate, inspect text, or search sources before answering    | Agents     | A domain-specific validated tool     | The existing agent runs selected tools in order. It does not autonomously browse, choose tools, or take external actions. |
| Repeat a known sequence such as draft → review → revise        | Workflows  | Knowledge as input context           | The two shipped templates are examples. New sequences require schema, runner, demo, and UI changes.                       |
| Describe a photo, read visible text, or review a screenshot    | Vision     | Workflows for a follow-up action     | Demo vision does not interpret images. Actual analysis needs a vision-capable provider.                                   |
| Hands-free or spoken input/output                              | Voice      | Chat or Knowledge as the destination | Browser recognition support varies and may use an online service. Keep typed input available.                             |
| Demonstrate usage and reliability of your prototype            | Analytics  | Custom activity labels               | Counts are local app events, not provider token usage, billing, or product analytics across users.                        |

Settings, UI primitives, provider configuration, feature flags, and the workspace store are shared infrastructure. You do not need to turn every module into a visible product feature.

## A practical selection sequence

1. Write the demo journey as **input → action → observable result**. Example: “Paste a policy → ask a leave question → see an answer with a source passage.”
2. Pick the one module that performs that action. Start with one or two modules unless the brief requires more.
3. Identify the domain-specific change: your data, prompt, tool, workflow sequence, or result presentation.
4. Check whether the desired result needs live generation. Demo fixtures are useful for developing the interface and rehearsing failure recovery, but are not evidence of model capability.
5. Build and verify the full journey before adding secondary features. Test one successful input and one failure case.
6. Keep unused code available; hide unnecessary modules with feature configuration. Do not delete shared dependencies to simplify navigation.

## Three combinations to adapt

### A source-backed support assistant

- **Use:** Knowledge first; add Chat only if multi-turn context matters.
- **First working slice:** load a short policy document, ask a question containing a relevant keyword, and show a citation.
- **Change:** replace the sample guide, tailor answer instructions in `src/app/api/knowledge/route.ts`, and present the source next to the answer.
- **If adding chat:** retrieve excerpts for the latest question before the provider call, pass source context, and keep citation metadata in the response/UI. The current chat NDJSON protocol has only text/done/error events; extend both server and consumer if sending citations through it.
- **Check:** a supported question includes evidence; an unrelated question gives an honest no-match result.
- **Skip initially:** a vector database, PDF ingestion, or shared team storage unless the brief requires them. None are shipped.

### A photo-to-report tool

- **Use:** Vision; add a workflow if the report needs multiple distinct transformations.
- **First working slice:** upload a supported image, ask one precise question, and show the live analysis.
- **Change:** prompt and output presentation in `src/features/vision.tsx`; pass the analysis into your workflow runner if composing modules.
- **Check:** invalid/oversized files are rejected; provider failure is visible; sample output is clearly labeled when demoing without a key.
- **Skip initially:** automatic OCR promises, image generation, and automatic image-to-workflow wiring. Those are not included.

### A planning or research helper

- **Use:** Workflows for a predictable brief/review/pitch sequence. Use Agents when explicit tool outputs are the central evidence.
- **First working slice:** enter a project idea and inspect every step. For a tool demo, select only Calculator and enter `(125 * 4) + 80` to get `580`.
- **Change:** domain prompts and workflow stage definitions in `src/lib/runners.ts`; add a new tool in `src/lib/tools.ts` with its ID in `src/lib/schemas.ts` when required.
- **Check:** later workflow steps receive earlier output; a tool error stops the agent with a useful trace.
- **Skip initially:** scheduled jobs, parallel agents, web research, or external writes. The starter contains none of these integrations.

## Choose a reuse approach

**Adapt this project:** Keep the existing Next.js app, use selected routes, replace demo/domain content, and update branding. This requires the least integration work.

**Embed a feature view:** Mount the exported view (for example `Knowledge`) inside a `WorkspaceProvider`. Bring its API route, schemas, shared components, hooks, CSS tokens, and provider configuration. See the exact dependency list in [MODULES.md](docs/MODULES.md).

**Reuse only the logic:** Import or copy `retrieve`, `calculate`, `runAgent`, `runWorkflow`, or analytics functions and build your own UI. Shared data contracts live in `src/lib/types.ts` without React or Next.js dependencies. Framework-specific API routes and browser state remain separate.

These are source modules, not separately published npm packages. A feature flag changes availability; it does not remove bundled dependencies or connect modules together.

## Configure only what you need

For a Knowledge + Chat demo, for example:

```dotenv
NEXT_PUBLIC_DISABLED_FEATURES=agents,vision,voice,workflows,analytics
```

Set this in `.env.local`, then restart development or rebuild production. The shared registry in `src/config/features.ts` controls links and pages; server routes enforce the same flags. Dashboard and Settings remain available. This hides modules, but does not automatically combine Chat and Knowledge.

For live AI, copy `.env.example` to `.env.local`, set the server-only `ANTHROPIC_API_KEY`, set `ENABLE_LIVE_AI=true`, restart, and choose **Live Mode** in Settings. Never place secrets in `NEXT_PUBLIC_` variables, UI code, prompts, or Markdown. Settings confirms configuration presence, not a working account/model. Rehearse an authorized live request separately when credentials are available.

## Working under a deadline

- **Very little time:** use one existing module, realistic input data, a clear result, and a reliable reset/retry path. Prioritize the judging requirement over adding navigation or features.
- **Time for one full integration:** combine two modules with an explicit data contract and one verified journey. Name the missing plumbing before coding it.
- **A larger build:** add persistence, authentication, sponsor APIs, or deployment only when the brief requires them. Treat those as new work with their own acceptance checks.

Before presenting, run `pnpm verify` and `pnpm format:check`, then follow [DEMO_GUIDE.md](docs/DEMO_GUIDE.md) for the modules you selected. When pnpm is unavailable, use `npx --yes pnpm@10.30.0` in its place. Keep a labeled demo fallback, show evidence for the claimed behavior, and avoid exposing paid provider endpoints publicly without access control and quotas.

## Instructions for the next coding agent

- Read the current checkpoint before changing anything. The starter baseline is already built; Stage 2 UI changes were authorized on 2026-09-16. Do not treat the old Stage 1 stop condition as a block on a new user request.
- Inspect the actual module and its tests before proposing replacement architecture. Choose the reuse level above; preserve server/client boundaries and cancellation/error behavior.
- Treat this guide’s examples as options, not the user’s selected project. Use the new hackathon brief to decide.
- Record the chosen modules, why they fit, data flow between them, live/demo requirements, unfinished integration, and next exact task in `PROJECT_STATUS.md`.
- Keep the neutral palette, open sections, readable spacing, and reduced-motion support unless the user changes the design direction.
- Verify only what you can actually run. Distinguish unit tests, mocked transport, HTTP smoke checks, browser interaction, and real provider calls in the handoff.
