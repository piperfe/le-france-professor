# ADR-0015: Fire-and-forget ResultAsync: use void, not .match()

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🛡️ Error Handling |
| Date | 2026-03-15 |

## Context

A runtime error appeared: "this.generateTitleUseCase.execute(...).match is not a function". The @Span() decorator wraps the return value in a plain Promise at runtime, stripping .match() from the ResultAsync.

## Decision

When calling a use case in a fire-and-forget context, use: void useCaseFn(). Do not chain .match() or .catch() on a @Span-decorated method.

## Consequences

- This is a @Span decorator gotcha — the decorator turns ResultAsync into a plain Promise.
- The void keyword signals intentional fire-and-forget to future readers.
- Errors are still captured — the @Span decorator calls span.recordException() on throw.

## Source Conversation

> **Mar 15 — Sunday — 16:46**
>
> **You:** I got an error
>
> TypeError: this.generateTitleUseCase.execute(...).match is not a function
>     at SendMessageUseCase.maybeGenerateTitle (backend/src/application/use-cases/send-message-use-case.ts:67:62)
