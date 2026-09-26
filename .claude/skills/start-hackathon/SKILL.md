---
name: start-hackathon
description: Adapt the existing Launchpad starter to a hackathon brief by selecting suitable modules, identifying missing integration, and building the requested demo journey.
---

Read `PROJECT_STATUS.md`, `CLAUDE.md`, `HACKATHON_GUIDE.md`, and `docs/MODULES.md` from the repository root. Inspect the selected modules and their tests before choosing an implementation. Do not reinitialize the completed starter.

Use the user's brief, target user, judging criteria, time constraints and available data to select the smallest useful module set. If essential brief details are absent, ask a focused question; otherwise state assumptions and proceed within the requested scope.

Describe input → action → observable result, which modules supply each part, and what glue is missing. The current Chat is not automatically grounded in Knowledge; Vision and Workflows are not automatically connected. Distinguish deterministic demo examples from live model capabilities.

If implementation is requested, build one end-to-end journey before optional features. Prefer adapting existing logic/contracts. Hide unused modules with the feature registry without deleting shared code. Use the user's authorized design direction; current defaults are neutral colors, open sections, whitespace and reduced-motion support.

Record chosen modules, integration decisions, actual verification, unfinished work and the next exact task in PROJECT_STATUS.md. A planning-only request ends with the plan. Do not infer permission to deploy, purchase services or perform external writes from the hackathon objective.
