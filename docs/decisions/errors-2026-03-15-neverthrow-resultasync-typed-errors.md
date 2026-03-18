# ADR-0014: neverthrow ResultAsync for use cases — typed errors at the boundary

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🛡️ Error Handling |
| Date | 2026-03-15 |

## Context

Early use cases threw exceptions from repository calls. The type signature gave no indication that a function could fail — callers could not know without reading the implementation.

## Decision

All use cases return ResultAsync<T, E> (neverthrow). Errors are part of the type signature. Route handlers call .match() to convert to HTTP responses.

## Consequences

- Callers are forced to handle both ok and err at compile time — no silent swallowing.
- Repository implementations may still throw (network errors) — caught by the use case and wrapped into err().
- Repositories that throw intentionally (like getById for 404) are documented exceptions.

## Source Conversation

> **Mar 15 — Sunday — 16:46**
>
> **You:** I got an error
>
> TypeError: this.generateTitleUseCase.execute(...).match is not a function
>     at SendMessageUseCase.maybeGenerateTitle (backend/src/application/use-cases/send-message-use-case.ts:67:62)
