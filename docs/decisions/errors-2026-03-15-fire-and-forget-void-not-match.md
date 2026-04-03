# ADR-0015: Fire-and-forget ResultAsync: use void, not .match()

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🛡️ Error Handling |
| Date | 2026-03-15 |

## Context

Two categories of post-response work exist in the backend:

1. **Title generation** — triggered after the 2nd student message (`GenerateTitleUseCase`)
2. **Topic extraction** — triggered after the 4th student message (`ExtractTopicUseCase`, ADR-0029)

Both enrich the `Conversation` entity with metadata the student never directly requested. Neither is on the critical path of the HTTP response — the student should not wait for them.

A runtime error exposed the implementation constraint: `this.generateTitleUseCase.execute(...).match is not a function`. The `@Span()` decorator wraps the return value in a plain Promise at runtime, stripping `.match()` from the ResultAsync.

## Decision

**Design principle: never block the student for background enrichment.** Title generation and topic extraction run asynchronously, *after* the HTTP response is returned. The student receives the tutor reply immediately — enrichment happens in the background.

**Implementation rule:** when calling a use case in a fire-and-forget context, use `void useCaseFn()`. Do not chain `.match()` or `.catch()` on a `@Span`-decorated method.

## Consequences

- Students never wait for background enrichment — the HTTP response latency is determined by the tutor LLM call only.
- The `void` keyword signals intentional fire-and-forget to future readers — it is a deliberate design choice, not an oversight.
- This is a `@Span` decorator gotcha — the decorator turns `ResultAsync` into a plain `Promise` at runtime.
- Errors are still captured — the `@Span` decorator calls `span.recordException()` on throw. Background failures do not crash the request.
- Any background task that must *not* be fire-and-forget (e.g., something the student depends on for the *next* turn) should be awaited before returning the response.

## Source Conversation

> **Mar 15 — Sunday — 16:46**
>
> **You:** I got an error
>
> TypeError: this.generateTitleUseCase.execute(...).match is not a function
>     at SendMessageUseCase.maybeGenerateTitle (backend/src/application/use-cases/send-message-use-case.ts:67:62)
