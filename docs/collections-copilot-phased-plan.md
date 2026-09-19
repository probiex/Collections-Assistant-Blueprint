# Collections Copilot — Phased Delivery Plan

## 1. Product Goal

Build a resilient payment collections web app for finance teams that:

- Prioritizes overdue invoices by risk.
- Explains the factors behind every risk score.
- Drafts relationship-aware collection messages at the appropriate escalation level.
- Continues working when AI is unavailable by switching to a deterministic fallback engine.
- Makes the AI/fallback transition visible as a deliberate product capability.

The first release should be optimized for a reliable three-minute demonstration while preserving a clean path toward production use.

## 2. Core Product Principles

1. **Fallback-first:** The complete workflow must function without an AI connection.
2. **One contract, two engines:** AI and fallback implementations return identical validated response shapes.
3. **Explainability over novelty:** Every score must include useful, invoice-specific reasoning.
4. **Relationship-aware collection:** Long customer history and strong payment behavior may soften tone, but must not hide genuine financial risk.
5. **No silent ambiguity:** The interface should identify whether an output came from AI or the rules engine.
6. **Demo controls are separate from business controls:** Forced fallback mode must be clearly presented as a demonstration setting, not ordinary user behavior.

---

## 3. Recommended Architecture

### Web application

- Dashboard with portfolio metrics, filters, and risk-ranked invoices.
- Invoice detail and message composer.
- Optional portfolio insights view.
- Client-side interaction state for drafts, filters, selected invoice, and demo mode.

### API service

- Invoice listing and detail endpoints.
- Risk scoring endpoint.
- Message generation/regeneration endpoint.
- Mark-as-sent endpoint.
- Portfolio insights endpoint, if included.

### Scoring and generation layer

- `RiskEngine` contract implemented by:
  - AI risk engine.
  - Deterministic fallback risk engine.
- `MessageEngine` contract implemented by:
  - AI message engine.
  - Template-based fallback message engine.
- Orchestrator that handles timeout, validation, errors, fallback, and output source.

### Data layer

- Start with the 18-invoice seed dataset.
- Compute days overdue from a single application-level reference date.
- Keep raw invoice facts separate from computed fields and generated outputs.
- Persist message status and sent timestamps if time permits; otherwise use clearly documented demo persistence.

### Shared output contracts

Risk result:

```ts
type RiskResult = {
  risk_level: "Low" | "Medium" | "High" | "Critical";
  risk_score: number;
  reasoning: string;
  source: "ai" | "fallback";
};
```

Message result:

```ts
type MessageResult = {
  subject: string;
  message: string;
  tone_used: "gentle" | "firm" | "serious" | "final";
  source: "ai" | "fallback";
};
```

Every external AI response must be parsed and validated before it reaches the UI.

---

## 4. Delivery Phases

## Phase 0 — Scope Lock and Acceptance Baseline

**Objective:** Remove ambiguity before implementation.

### Work

- Confirm the first release contains:
  - Dashboard.
  - Invoice detail/composer.
  - Fallback scoring and messages.
  - Optional AI scoring and messages.
  - Mark-as-sent interaction.
  - Forced fallback demo control.
- Treat portfolio insights as optional until the core flow is complete.
- Define the four hero invoices and expected qualitative outcomes.
- Define shared risk and message contracts.
- Decide how dates behave:
  - Production mode uses the current date.
  - Demo mode should use a fixed reference date or regenerated relative seed dates so expected hero outcomes do not drift over time.
- Define timeout and fallback policy.

### Deliverables

- Locked MVP scope.
- Output schemas.
- Hero-invoice expectation table.
- Demo reference-date policy.

### Exit criteria

- Each hero invoice has an expected risk band, key reasoning factors, and message tone.
- AI failure behavior is unambiguous.

---

## Phase 1 — Data Foundation and Deterministic Engine

**Objective:** Produce a complete, useful application engine without AI.

### Work

- Add and validate the 18-invoice seed dataset.
- Normalize dates, amounts, segments, histories, statuses, and nullable values.
- Compute:
  - Days overdue.
  - Amount-to-annual-volume ratio.
  - Portfolio totals.
- Implement fallback risk scoring.
- Improve fallback reasoning so it explains:
  - Overdue duration.
  - Payment history.
  - Reminder history.
  - Relative amount exposure.
  - Relationship-based softening, when applied.
- Implement the four message templates.
- Apply relationship-aware tone adjustment.
- Format Indian currency and dates consistently.
- Add unit tests for scoring boundaries and tone selection.

### Deliverables

- Validated invoice dataset.
- Deterministic risk engine.
- Deterministic message engine.
- Repeatable outputs for all 18 invoices.

### Exit criteria

- All invoices receive valid scores, risk levels, reasoning, and messages.
- The four hero invoices produce intentionally different results.
- Reasoning is specific enough that two materially different invoices do not read as canned duplicates.
- No AI credentials or network connection are required.

---

## Phase 2 — Core API and Dashboard Experience

**Objective:** Make the fallback-first product usable end to end.

### Work

- Expose invoice list and detail APIs.
- Return computed fields and risk results through validated API responses.
- Build portfolio metrics:
  - Total overdue amount.
  - Overdue invoice count.
  - Counts by risk level.
  - A clearly defined recovery metric.
- Avoid presenting “projected recovery” until its formula is defined. For the MVP, prefer “amount requiring action” or document a simple deterministic estimate.
- Build the dashboard:
  - Risk-ranked invoice list.
  - Search.
  - Filters for risk, status, and segment.
  - Clear source indicator.
  - Responsive loading, empty, and error states.
- Ensure sorting is stable: risk severity, then score, days overdue, and amount.

### Deliverables

- Working risk-ranked dashboard.
- Portfolio summary metrics.
- Search and filtering.
- Navigation into invoice detail.

### Exit criteria

- A user can identify the highest-priority accounts within seconds.
- Every displayed metric has a defined calculation.
- Dashboard behavior remains correct using fallback data only.

---

## Phase 3 — Invoice Detail and Collection Workflow

**Objective:** Complete the primary user workflow from prioritization to follow-up.

### Work

- Build invoice detail with:
  - Customer and invoice facts.
  - Payment and reminder history.
  - Risk score and visible reasoning.
  - Output source.
- Build editable subject and message fields.
- Add regeneration controls:
  - Recommended tone.
  - Softer.
  - Firmer.
- Define tone override behavior so “softer” and “firmer” move one step on the escalation ladder without exceeding its bounds.
- Add mark-as-sent behavior:
  - Update status.
  - Record sent timestamp.
  - Increment or record reminder activity.
  - Show success feedback.
- Protect unsaved edits when changing invoices.

### Deliverables

- Complete invoice-to-message workflow.
- Editable and regeneratable drafts.
- Sent-state update and feedback.

### Exit criteria

- A user can open any invoice, understand its priority, edit a draft, adjust tone, and mark it sent.
- Status changes are reflected on both detail and dashboard views.

---

## Phase 4 — AI Enhancement with Guaranteed Fallback

**Objective:** Add higher-quality AI reasoning without making it a dependency.

### Work

- Connect the chosen AI provider through the server.
- Keep provider-specific code behind the engine interface.
- Build concise prompts for:
  - Risk scoring.
  - Message generation.
  - Optional portfolio insights.
- Enforce:
  - Server-side calls only.
  - Strict timeout, initially 8 seconds.
  - Structured output.
  - Schema validation.
  - Risk-score bounds.
  - Allowed risk and tone enums.
- Fall back on:
  - Missing AI configuration.
  - Timeout.
  - Network failure.
  - Provider error or rate limit.
  - Empty response.
  - Malformed JSON.
  - Schema-invalid or out-of-range output.
- Log operational failure category without exposing sensitive values.
- Return the actual output source to the UI.

### Deliverables

- AI-backed scoring and drafting.
- Validated orchestration layer.
- Automatic fallback for every known failure category.

### Exit criteria

- AI mode improves output quality when available.
- Turning AI off does not change the response contract or interrupt the workflow.
- Malformed AI responses never reach the UI.

---

## Phase 5 — Resilience and Demonstration Controls

**Objective:** Make the fallback architecture observable, testable, and safe to demonstrate.

### Work

- Add an explicit “Force offline engine” control in a demo/settings area.
- Display polished source labels:
  - AI assisted.
  - Offline rules engine.
- Do not use icons alone; include accessible text.
- Add a short explanation of what offline mode means.
- Add fallback test cases for:
  - Missing AI configuration.
  - Timeout.
  - Provider error.
  - Malformed JSON.
  - Invalid enum or score.
- Add tests for all escalation boundaries: 14/15, 30/31, and 60/61 days.
- Verify hero outcomes under the fixed demo reference date.

### Deliverables

- Reliable demo toggle.
- Visible graceful degradation.
- Automated fallback coverage.

### Exit criteria

- The presenter can switch engines live without reloading or losing context.
- The same invoice remains selected and usable after switching.
- Forced fallback produces a visibly intentional state, not an error state.

---

## Phase 6 — Portfolio Insights and Operational Polish

**Objective:** Add the final product layer after the core workflow is stable.

### Work

- Add portfolio insights only if Phases 1–5 are complete.
- Generate or calculate:
  - Total critical exposure.
  - Accounts requiring action this week.
  - Concentration among top customers.
  - Short recommended action summary.
- Apply the same AI/fallback contract to narrative insights.
- Add final visual polish:
  - Responsive layouts.
  - Keyboard and focus behavior.
  - Contrast and readable risk indicators.
  - Clear loading and action feedback.
  - Consistent Indian currency/date formatting.
- Add basic product context, attribution, and privacy messaging.

### Deliverables

- Optional insights view.
- Presentation-ready interface.
- Consistent accessibility and responsive behavior.

### Exit criteria

- The main workflow remains fast and uncluttered.
- Insights add decision value rather than repeating dashboard metrics.
- The product is usable on common laptop and mobile widths.

---

## Phase 7 — Release and Demo Readiness

**Objective:** Verify the exact experience that will be judged.

### Work

- Run a fresh-session smoke test.
- Verify both AI-enabled and fallback-only operation.
- Verify the published URL rather than only the development preview.
- Confirm no sensitive configuration is exposed in browser code or logs.
- Rehearse the three-minute flow:
  1. Problem and portfolio overview.
  2. Meridian: relationship-aware softening.
  3. Kaveri: chronic lateness and escalation.
  4. Ganges: nuanced high-value relationship case.
  5. Regenerate tone.
  6. Force offline mode and continue without interruption.
  7. Close with business value.
- Prepare a reset path so sent statuses and edited drafts can be restored before each demo.

### Deliverables

- Published, verified application.
- Repeatable demo dataset.
- Reset procedure.
- Final submission copy and demo script.

### Exit criteria

- The demo completes in under three minutes.
- It works in a fresh browser session.
- It works with AI enabled and disabled.
- The hero invoices produce the expected narrative.

---

## 5. Suggested Execution Schedule

For a focused buildathon implementation:

| Block | Focus | Target state |
|---|---|---|
| 0:00–0:25 | Phase 0 | Contracts, scope, date policy, hero expectations locked |
| 0:25–1:10 | Phase 1 | Fully working deterministic engines |
| 1:10–2:00 | Phase 2 | Functional risk-ranked dashboard |
| 2:00–2:45 | Phase 3 | Complete message workflow |
| 2:45–3:25 | Phase 4 | AI enhancement with strict fallback |
| 3:25–3:45 | Phase 5 | Demo toggle and failure checks |
| 3:45–4:05 | Phase 6 | Polish; insights only if safe |
| 4:05–4:30 | Phase 7 | Publish, fresh-session test, rehearse, submit |

If time slips, remove portfolio insights first. Do not remove fallback behavior, message editing, mark-as-sent, or demo verification.

---

## 6. Priority Classification

### P0 — Required

- Seed dataset and computed overdue days.
- Deterministic scoring and reasoning.
- Deterministic message generation.
- Dashboard and invoice detail.
- Editable draft and tone adjustment.
- Mark-as-sent behavior.
- AI orchestration with timeout and schema validation.
- Automatic and forced fallback.
- Source indicator.
- Published-link verification.

### P1 — Strongly recommended

- Search and filters.
- Persistent sent status.
- Stable demo reference date/reset.
- Automated scoring, tone-boundary, and fallback tests.
- Accessible responsive polish.

### P2 — Optional

- Portfolio narrative insights.
- Advanced analytics.
- Bulk follow-up actions.
- Real payment-provider synchronization.
- Email or messaging delivery.

---

## 7. Key Corrections to the Original Plan

1. **Dynamic dates need demo control.** Computing against the real current date is correct for production, but the intended hero narratives will drift. Use a fixed demo reference date or relative seed generation.
2. **“Projected recovery” needs a formula.** Do not show an unexplained financial projection. Replace it with a factual metric until a defensible model exists.
3. **Fallbacks should be quiet operationally, not invisible.** The workflow should continue without an error page, but the source should remain visible and logs should record the failure category.
4. **AI output must be schema-validated.** Catching `JSON.parse` errors is not enough; valid JSON may still contain invalid enums, missing fields, or unsafe scores.
5. **The user interface should not call AI directly.** AI configuration and provider calls belong on the server.
6. **Emoji-based badges should not be the only signal.** Use text, color, and accessible labels.
7. **Mark-as-sent needs defined data behavior.** It should update status, timestamp, and reminder history consistently.
8. **Demo reset is required.** A rehearsed workflow mutates status and drafts; provide a reliable reset before judging.
9. **Insights should not compete with the core workflow.** Build them only after scoring, drafting, fallback, and demo mode are complete.

---

## 8. Definition of Done

The MVP is complete when:

- All 18 invoices load and compute valid overdue values.
- Every invoice receives a validated risk result and collection draft.
- The dashboard is sorted and filterable by meaningful collection priority.
- The four hero invoices tell distinct, credible stories.
- Users can edit and regenerate messages and mark them sent.
- AI responses are validated and automatically fall back on every failure path.
- Forced offline mode works without disrupting the interface.
- Output source is clearly and accessibly displayed.
- No AI credential is exposed to the browser.
- The application works in a fresh session at its published URL.
- The full demo has been rehearsed under three minutes.

## 9. Post-MVP Roadmap

After the buildathon:

1. Replace seed-only state with persistent invoice, customer, reminder, and message records.
2. Add authentication and organization isolation.
3. Integrate real payment and invoice data.
4. Add email or messaging delivery with approval and audit history.
5. Add collection policies by customer segment.
6. Add human feedback on scores and drafts to improve recommendations.
7. Add observability for AI usage, fallback frequency, latency, and collection outcomes.
8. Add compliance controls, retention policies, and role-based permissions.