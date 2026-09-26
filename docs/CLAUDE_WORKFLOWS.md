# Claude skills and agent roles

Launch Claude Code from the repository root. Project skills live under `.claude/skills/<name>/SKILL.md`; project agents are individual Markdown files under `.claude/agents`. These files describe workflows and roles; they do not grant extra tool permissions, install credentials, or require experimental agent teams.

## Pick a skill

| Request                                       | Skill           | Example invocation                                                      | Expected result                                                                              |
| --------------------------------------------- | --------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Turn a hackathon brief into a focused project | start-hackathon | `/start-hackathon Build a policy Q&A assistant; six hours remaining.`   | Select modules, identify missing glue, implement the requested journey with checkpoints.     |
| Recover after interruption                    | resume-build    | `/resume-build`                                                         | Inspect current state and continue Next Exact Task without restarting finished phases.       |
| Add or extend a feature                       | add-feature     | `/add-feature Add export to Knowledge.`                                 | Extend the relevant view/logic, preserve contracts, verify meaningful behavior.              |
| Integrate another AI backend                  | add-provider    | `/add-provider Replace the live adapter with our required sponsor API.` | Update contract/factory/status/UI labels, preserve demo and error behavior, test with mocks. |
| Verify a completed build or iteration         | verify-baseline | `/verify-baseline`                                                      | Run checks, record actual results, prepare/reuse the local preview and report limits.        |

Skills also have descriptions for automatic selection. A plain-language request can select one when relevant. New user authorization takes precedence over historical Stage 1 stop instructions; a completed baseline does not prevent requested follow-up work.

## Agent responsibilities

| Agent            | Scope                                                          | Expected handoff                                                                  |
| ---------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| architect        | Read-only module selection and architecture review             | Small implementation plan, data flow, missing pieces, files and acceptance checks |
| frontend-builder | Views, shared controls, layout, tokens and motion              | UI changes, responsive/accessibility considerations, actual verification          |
| ai-engineer      | Providers, API boundaries, types, tools, retrieval and runners | Contracts, logic changes, tests and capability gaps                               |
| quality-reviewer | Review and command execution; no source edits                  | Reproducible findings, results and unperformed checks                             |

Ask for a bounded assignment, for example: “Use the architect to review which existing modules fit this brief.” The coordinating session integrates work and updates PROJECT_STATUS.md. Give concurrent agents separate file ownership if you request parallel work. The roles do not automatically spawn or coordinate a team. Execution roles allow Bash and PowerShell so they can use the shell available in the host Claude Code session; unavailable tools do not become available simply by listing them.

## What the review checks

`pnpm check:docs` checks project Markdown links and the expected skill/agent file structure, required scalar fields, names, tool allowlists and unfinished scaffold markers. It is intentionally limited to this repository's simple frontmatter format; a full YAML validator is used separately during the skill review when available. Project-owned Markdown excludes installed dependencies and generated build files.

Content review must also check that:

- Every source/reference path exists and points to the current system.
- Skills identify the active phase, preserve the user's scope, and handle pnpm/Git availability honestly.
- Provider work accounts for the provider ID union, factory/status, environment configuration, UI labels, image/stream capabilities and tests.
- Feature work distinguishes UI-only modules from modules requiring server endpoints.
- Recovery resumes the next exact task and never treats an old PASS or server session as a current check.
- Verification distinguishes static checks, mocked providers, HTTP responses, browser interaction and real paid requests.

## Practical review scenarios

| Scenario                                  | Behavior to look for                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Stage 1 is done; user asks for a sober UI | Continue the authorized iteration; do not ask to unlock Stage 2 again.                              |
| Add a browser-only notes widget           | Reuse UI/state as needed; do not invent a model call or paid dependency.                            |
| Add a provider without vision             | Expose or clearly handle the missing capability; do not send unsupported image input silently.      |
| Start a document Q&A hackathon            | Choose Knowledge; add Chat only if conversational history matters and explicitly connect retrieval. |
| Resume in a folder without Git            | Preserve files and use persistent checkpoints; missing Git is not a blocker.                        |
| Browser unavailable during verification   | Complete available checks and report browser inspection as unavailable.                             |

These are review prompts, not claims that autonomous Claude sessions were executed. Static validation cannot guarantee an LLM's behavior. See PROJECT_STATUS.md for the actual checks performed in this build and [the official skill documentation](https://code.claude.com/docs/en/skills) and [agent documentation](https://code.claude.com/docs/en/sub-agents) for Claude-specific loading behavior.
