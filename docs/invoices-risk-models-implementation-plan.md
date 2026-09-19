# Invoices and Risk Models — Implementation Plan

## Goal

Complete the two unfinished Collections Copilot navigation areas as real operational pages using the existing invoice, scoring, settings, and message data.

## Phase 1 — Information Architecture

### Invoices

- Add `/invoices` as the portfolio-wide invoice workspace.
- Keep `/invoices/:id` as the existing review and message-composer flow.
- Make both routes appear active under the Invoices navigation item.

### Risk Models

- Add `/risk-models` as an explainability and model-monitoring page.
- Present the active engine, risk thresholds, contributing factors, portfolio distribution, and invoice-level reasoning.
- Keep the page read-only because the current backend does not support changing model weights.

## Phase 2 — Invoices Page

- Load invoices from the existing dashboard endpoint.
- Add search across customer, invoice ID, and contact.
- Add filters for risk, status, and customer segment.
- Add useful sorting for collection work:
  - Priority.
  - Amount.
  - Days overdue.
  - Customer.
- Show result counts and make active filters easy to reset.
- Display amount, overdue age, risk score and level, status, segment, and scoring source.
- Link every result to the existing invoice detail page.
- Include loading, empty, and no-results states.

## Phase 3 — Risk Models Page

- Load live invoices and collection settings.
- Show active engine, AI availability, fallback state, and scoring reference date.
- Explain the four risk bands and their score thresholds.
- Explain the deterministic model inputs:
  - Days overdue.
  - Payment history.
  - Reminders sent.
  - Invoice-to-annual-volume ratio.
  - Relationship-value adjustment.
- Calculate live portfolio counts and financial exposure by risk level.
- Show invoice-level decision evidence with score, level, source, and reasoning.
- Avoid unsupported editing or tuning controls.

## Phase 4 — Navigation and Responsive Access

- Replace disabled sidebar links with working routes.
- Preserve active navigation styling on nested invoice detail routes.
- Add mobile navigation so the new pages remain reachable when the desktop sidebar is hidden.
- Preserve the existing dashboard, settings, and invoice composer behavior.

## Phase 5 — Verification

- Run the Collections Copilot TypeScript check.
- Restart the managed web workflow once after the complete change.
- Check application and browser logs.
- Visually verify the Invoices and Risk Models pages in the running preview.

## Definition of Done

- Invoices and Risk Models are reachable from desktop and mobile navigation.
- Both pages render real API data and no placeholder records.
- Invoice search, filters, sorting, and review navigation work.
- Risk Models accurately represents the backend scoring rules and live portfolio results.
- Loading, empty, and error-safe states are present.
- The existing dashboard and invoice detail routes remain functional.
- Type checking and runtime startup complete without errors.