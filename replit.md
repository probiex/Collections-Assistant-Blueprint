# Collections Copilot

A resilient collections workspace that prioritizes overdue invoices, explains risk, and drafts relationship-aware follow-ups.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/collections-copilot run dev` — run the web app through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/collections-copilot` — React/Vite application
- `artifacts/api-server/src/lib/collections-*` — seed data, scoring, drafting, and demo state
- `artifacts/api-server/src/routes/collections.ts` — Collections API routes
- `lib/api-spec/openapi.yaml` — source of truth for API contracts

## Architecture decisions

- A fixed 2026-09-19 demo date keeps hero-invoice outcomes stable.
- AI and fallback engines share identical validated response contracts.
- Demo mutations use resettable in-process state; no production ledger data is implied.

## Product

- Risk-ranked dashboard with search and risk, status, and segment filters
- Explainable invoice detail and editable message composer
- Softer/firmer regeneration, mark-as-sent, offline forcing, and demo reset

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
