---
name: resume-build
description: Resume an interrupted Launchpad build from the persistent checkpoint without repeating completed phases.
---

Read `PROJECT_STATUS.md`, then `CLAUDE.md` and `RESUME.md`. Inspect Git status when a repository exists and the files named in **Next Exact Task** before editing. A missing Git repository does not block work. For a new hackathon brief, also read `HACKATHON_GUIDE.md` and `docs/MODULES.md`.

Preserve the completed architecture unless inspection reveals a concrete fault. Finish the smallest coherent outstanding task, verify it, and update the checkpoint with changed files, actual command results, issues, and the next exact action.

Identify the active phase and latest user request. Stage 1 ends only after install, lint, typecheck, tests, build, and repository acceptance checks pass; its server-start gate does not apply to already-authorized Stage 2 work. Continue the user's requested iteration without asking them to repeat approval. If no new work is requested and the checkpoint is complete, report readiness rather than inventing a new task.

Do not trust an old server session ID or historical PASS result as current execution evidence. Check whether the expected app still responds before starting a second server. Preserve the documented UI direction and update the checkpoint as you work.
