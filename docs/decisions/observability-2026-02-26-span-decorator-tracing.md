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

## Source Conversation

> **Feb 26 — Thursday — 20:22**
>
> **You:** can we actually maintain the current implementation ??? or an alternative ?? I do not like to cover the code with startActivespan function ...
