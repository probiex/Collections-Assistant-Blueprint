# Collections Copilot Professionalization Plan

This plan converts the finance-operations review into a staged implementation that strengthens the product without overlapping the separately planned export/share and Razorpay integration work.

## Phase 1 — Finance Credibility

### Goal
Make the overview immediately recognizable as an accounts-receivable product.

### Deliverables
- Calculate current DSO as an invoice-amount-weighted average of `days overdue + payment terms`.
- Show DSO prominently on the overview with a plain-language explanation.
- Compare current DSO with a deterministic prior-period benchmark.
- Add live AR aging buckets for 0–30, 31–60, 61–90, and 90+ days.

### Acceptance criteria
- Values are derived from the current dashboard data rather than hardcoded totals.
- Empty and loading states remain safe.
- Existing portfolio and risk metrics remain unchanged.

## Phase 2 — Predictive Collections

### Goal
Move invoice review from reactive follow-up to forward-looking collections guidance.

### Deliverables
- Calculate a predicted payment date from payment behavior, due date, last reminder, and reminder count.
- Show a High, Medium, or Low confidence label with a concise explanation.
- Keep the calculation deterministic so it works in fallback mode.

### Acceptance criteria
- Every invoice detail view shows a valid prediction.
- Prediction logic handles missing reminder dates.
- Existing risk reasoning and message-composer behavior remain intact.

## Phase 3 — Customer Relationship Workspace

### Goal
Add a customer-centric view that explains the full relationship, not only one invoice.

### Deliverables
- Add `/customers/:invoiceId` as a customer relationship route.
- Show relationship duration, current exposure, annual volume, current risk, predicted payment, and communication activity.
- Build a reverse-chronological timeline from live invoice/message data plus clearly labeled deterministic historical demo events.
- Make the full mobile customer card clickable.
- Make customer names clickable in desktop tables and related portfolio views.
- Preserve independent checkbox selection and bulk actions.

### Acceptance criteria
- Clicking a customer card or linked customer name opens the matching customer workspace.
- Keyboard users can open the customer workspace.
- Checkbox and bulk-action interactions do not trigger navigation.
- The customer page links back to the invoice review flow.

## Phase 4 — Reporting Depth

### Goal
Provide the expected AR aging analysis without implementing export/share functionality owned by the next project phase.

### Deliverables
- Add a live aging distribution to Reports using the four standard buckets.
- Show both outstanding amount and invoice count.
- Connect the report to filtered invoice operations.

### Acceptance criteria
- Totals reconcile to the current dashboard invoices.
- The report is responsive and readable on mobile.
- No export, print, sharing, payment, or integration behavior is added in this phase.

## Validation

- Typecheck the Collections Copilot artifact and API server.
- Restart affected workflows and inspect logs.
- Verify overview, invoice detail, customer workspace, reports, and mobile customer cards.
- Confirm the selected Bali Retreat Expense Tracker canvas mockup is unchanged.