# ADR-0007: Static root page requires export const dynamic = "force-dynamic"

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | ⚛️ Frontend Patterns |
| Date | 2026-03-16 |

## Context

Next.js pre-renders static routes at build time. The welcome page / fetches recent conversations server-side — in E2E tests the page always showed an empty list because it was reading the build-time snapshot.

## Decision

Any server component at a static route that fetches live data must export: export const dynamic = "force-dynamic". Dynamic-segment pages like [id] are already opted out of SSG automatically.

## Consequences

- Without this, E2E tests see stale build-time HTML regardless of what the stub backend returns.
- Dynamic routes ([conversationId]) do not need this — Next.js skips SSG for them automatically.
- Applies to all current and future pages at the root / path.

## Source Conversation

> **Mar 16 — Monday — 18:08**
>
> **You:** can you explain me better ?
