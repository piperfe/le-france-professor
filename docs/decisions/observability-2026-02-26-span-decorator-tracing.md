# ADR-0016: @Span() decorator — tracing without polluting business logic

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 📡 Observability |
| Date | 2026-02-26 |

## Context

Initial OTel implementation wrapped every method in tracer.startActiveSpan(...) — this mixed infrastructure concerns into use case code.

## Decision

Use the @Span() TypeScript decorator on async methods in use cases and services. It handles span creation, error recording, status, and end(). Business logic methods stay clean.

## Consequences

- Requires experimentalDecorators: true in backend/tsconfig.json.
- Default span name: ClassName.methodName — overridable with @Span("custom-name").
- Side effect: @Span wraps return value in a plain Promise, stripping ResultAsync — see fire-and-forget ADR.
- handleError in Express was reverted to simple form — @Span already captures exceptions.

## Update — 2026-04-11

The "Side effect: @Span wraps return value in a plain Promise, stripping ResultAsync" consequence, combined with a hexagonal architecture violation (application layer importing from infrastructure), motivated a change to how use cases are traced.

**Use cases no longer use `@Span()`.**  They are wrapped with `withTracing()` at the composition root (`src/index.ts`). This is a JS Proxy that intercepts method calls and wraps them in spans — same span naming convention (`ClassName.methodName`), same error handling — but applied from outside the use case, keeping the application layer free of infrastructure imports.

`@Span()` is retained for infrastructure service methods (LLM, WhatsApp) where the decorator pattern remains appropriate.

The shared wrapping logic (`wrapResultAsync`, `wrapPromise`, `endSpanOk`, `endSpanErr`) lives in `infrastructure/telemetry/span-wrappers.ts`, used by both mechanisms.

## Source Conversation

> **Feb 26 — Thursday — 20:22**
>
> **You:** can we actually maintain the current implementation ??? or an alternative ?? I do not like to cover the code with startActivespan function ...
