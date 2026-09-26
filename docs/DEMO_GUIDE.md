# Five-minute demo

Use this to exercise the existing modules in Demo Mode. The initial baseline is complete; for a changed build, check PROJECT_STATUS.md for its actual verification. No AI API credentials are required. Browser microphone and speech services may need network access and permissions.

1. Open **Overview**. Counts begin at zero and reflect your actions.
2. Open **AI Chat**, choose a starter, then send a follow-up. Export the conversation or start a new one. Output explicitly identifies Demo Mode.
3. Open **Knowledge**, click **Load sample**, and ask “How does Demo Mode work?” Inspect a citation. Import a `.txt` or `.md` file to try your own text.
4. Open **Agents**, select only **Calculator**, and enter `(125 * 4) + 80`. The tool trace should contain `580`. Try `1 / 0` to see a real tool failure. Select **Search knowledge** with a document-related goal to reuse your sources.
5. Open **Vision**, select an image under 4 MB, and run analysis. The demo output says the actual image was not interpreted.
6. Open **Voice**, type a message and send it. Try read-aloud if supported. Microphone capture is optional and browser-dependent.
7. Open **Workflows**, enter an idea, run **Idea to pitch**, and inspect all three step outputs. Switch to **Review & improve** for a two-step run.
8. Open **Analytics** to see those actual runs, mode filters, successes/failures, and durations. Export the run list.
9. Open **Settings**, inspect provider readiness and enabled features, then export the workspace. Reset only if you want to clear the browser data.

For a live demo, configure the server environment as described in README. Verify your model/account separately; automated tests mock the provider and do not certify credentials.

## UI review

- Check the landing page, open module list, Chat, and a form-heavy module at desktop and phone widths. Headings and action buttons should wrap without horizontal scrolling.
- At phone width, open navigation, move focus with Tab, close with Escape and reopen. Closed navigation should not capture keyboard focus.
- Navigate between modules to check short entry transitions. Enable your system's reduced-motion preference: page/list/bar movement and hover translations should stop.
- Inspect error, loading, empty and result states. Only purposeful controls such as inputs and the image upload target need bounded surfaces; avoid repeated outer boxes.

For turning these examples into a project, read [HACKATHON_GUIDE.md](../HACKATHON_GUIDE.md), then [MODULES.md](MODULES.md).
