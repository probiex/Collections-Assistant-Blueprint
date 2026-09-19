---
name: Collections reporting safeguards
description: Durable lessons for the Collections Copilot reporting and export surface.
---

Reporting and finance-intelligence helpers must remain single-source modules. A prior edit left repeated full-file copies in place, which produced duplicate exports and blocked both Vite and TypeScript.

**Why:** Repeated source content fails at transform time before the UI can render, and the error list can make one corruption event look like dozens of unrelated bugs.

**How to apply:** If a transform reports many duplicate exports, inspect module boundaries and repeated imports first; fix the source duplication before changing feature logic.