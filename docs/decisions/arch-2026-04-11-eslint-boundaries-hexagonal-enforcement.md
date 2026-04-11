# ADR-0031: eslint-plugin-boundaries — automated hexagonal layer enforcement

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 📐 Architecture |
| Date | 2026-04-11 |

## Context

ADR-0001 established the hexagonal architecture and its import matrix, but violations could only be caught in code review. In practice, all 10 application use cases had been importing `@Span()` from `infrastructure/telemetry/decorators` — a direct `application → infrastructure` dependency — for months without detection.

## Decision

Add `eslint-plugin-boundaries` (v6) to the backend ESLint config and encode the permitted import matrix as lint rules:

```
domain         → (nothing)
application    → domain, application
infrastructure → domain, application, infrastructure
adapters       → domain, application, adapters
```

Test files are excluded from boundary rules — they can import across layers freely.

## Consequences

- Layer violations fail `npm run lint` and CI automatically — no code review required to catch them.
- Import violations surface immediately in the editor (ESLint integration).
- Discovering the existing violation (`application → infrastructure` via `@Span()`) prompted the `withTracing()` proxy refactor (see ADR-0016 update) — automated enforcement paid off on day one.
- `index.ts` (composition root) is intentionally outside all boundary elements — it wires everything together and is allowed to import any layer.
- Test files can freely cross layer boundaries, which is intentional: unit tests mock adjacent layers by design.

## Source Conversation

> **Apr 11 — Friday**
>
> **You:** can re review the hexagonal architecture ??? there are some rules that probably the imports are violating ... review the pti-salmoneras project [...] we automated the rules
