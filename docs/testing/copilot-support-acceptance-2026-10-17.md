# Queen Bee support acceptance — 2026-10-17

The dashboard assistant now uses authenticated, workspace-owned support conversations. Talk to a person sends the shared transcript to Live Conversations. The panel recovers replies through periodic history reads as well as realtime events, displays queue/agent status, and supports returning to Queen Bee. Public widgets use the workspace assistant alias and token-bound history. The agent inbox refreshes its list and selected conversation.

Validation:

- TypeScript: `node_modules/.bin/tsc --noEmit --incremental false` passed.
- ESLint passed for the three changed support components.
- All 14 light/dark support control contrast checks passed; palette inputs are in [copilot-support-contrast.json](./copilot-support-contrast.json).
- Central browser: normal demo sign-in, grounded answer, human handoff, shared transcript in Live Conversations, inbox reply delivered to the requester, return to Queen Bee, and a subsequent assistant answer all passed.
- Tenant browser: normal sign-in, grounded answer, tenant inbox handoff, delivered agent reply, restored transcript after a full page refresh, and return to Queen Bee passed.
- Live backend API acceptance passed in central and the approved local verification tenant, including public widget generation, escalation, history recovery, and resume.

The coordinated backend patch adds /copilot/support, /copilot/support/messages, /copilot/support/resume, and public session history. Deploy the backend contract with this frontend. Detailed backend evidence and the local rerun script are documented in the backend repository's docs/testing/copilot-acceptance-2026-10-17.md and scripts/verify-copilot-local.php.

These are local verification results. Production deployment and every external embed/network combination are not covered.
