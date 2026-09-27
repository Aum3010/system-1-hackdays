# Copy-paste prompt for the next model

You are continuing an existing hackathon implementation. Work directly in:

`C:\Users\prath\Desktop\Programs\Hack_day\system-1-hackdays-new-work`

Read `AGENTS.md`, `HANDOFF.md`, and `CHECKPOINTS.md` first. Do not scaffold a new app or rewrite working modules. The sibling `system-1-hackdays` worktree on main must remain untouched. Current branch is `new-work`; leave commit/push for the user unless explicitly instructed otherwise.

Build objective: finish and personally verify **Object Arena — Snap it. Spawn it. Battle it.** Two players photograph ordinary objects; Gemini returns structured object perception and playful names; Laya or the deterministic fallback assigns categorical game behavior; bounded application code creates fighters; local turn-based combat produces a winner and supports rematch/reset. The complete modular implementation already exists. Your main job is credential integration, browser verification, bug fixing and final polish.

Follow the prioritized runbook in `HANDOFF.md`. In particular:

1. Start/reuse the server at `http://127.0.0.1:3000`. Run the existing tests and production build. Use `npm.cmd`/`npx.cmd` in Windows PowerShell.
2. Gemini is configured and real bottle/laptop recognition works. The live two-photo browser battle test passed. Preserve the fixes: `thinking_level:'low'` and the single-root structured response envelope. Do not expose the key or regress to the failing top-level union.
3. Use existing verification commands after relevant changes. Complete the remaining real-image matrix and inspect additional mobile/edge-case layouts. Do not replace real recognition with canned data.
4. Ask whether the user's Laya endpoint is now ready. They are configuring it and asked to be asked again when needed. A real Laya typed-decision server is required; a Hugging Face model URL/token alone is not enough. Keep fallback working.
5. Complete all browser tests, inspect generated screenshots at desktop/mobile sizes, fix issues, and update the checkpoint/docs with actual results.

Keep scope to local two-player combat. Do not add auth, databases, multiplayer networking, generated art, inventory systems or new modes. Keep shared schemas and pure game modules reusable. Protect secrets and preserve user edits. Work autonomously; only ask for information you cannot obtain yourself. Do not spawn subagents unless the user asks; previous agents exhausted their usage budget.

The core flow has now passed: real photos → Gemini → fallback decisions → two fighters → browser battle → winner; rematch/reset passed the offline browser suite. Live Laya remains unverified. Preserve this distinction in your final report. Never treat fixture tests as proof of provider accuracy.
