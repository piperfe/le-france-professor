# ADR-0003: DI Container — lib/container.ts for server-side wiring

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🏗️ System Architecture |
| Date | 2026-03-04 |

## Context

Use cases depend on repository interfaces. Route handlers need concrete implementations injected without importing infrastructure code directly.

## Decision

All server-side wiring lives in lib/container.ts. Route handlers import from the container — never instantiate repositories directly. Container is server-only — never bundled into browser code.

## Consequences

- Swapping an implementation only requires changing container.ts.
- No test-specific conditionals in production routes.
- TypeScript interface compliance is enforced at the container boundary.

## Source Conversation

> **Mar 4 — Wednesday — 16:53**
>
> **You:** can you propose something maintaining the current hexagonal architecture and incorporating NEXT ??? the two approuches work well ??? nope ??? any idea ?
>
> **Claude:** The real insight: In hexagonal architecture, adapters drive the use cases. Next.js gives you two kinds of primary adapters: Server Components / Server Actions / Route Handlers — server-side, call use cases directly. The DI container lives in lib/container.ts — wires all use cases once, imported by route handlers only.
