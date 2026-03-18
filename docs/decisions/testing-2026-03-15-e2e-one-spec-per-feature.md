# ADR-0012: E2E: one spec file per feature + shared helpers.ts

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🧪 Testing Strategy |
| Date | 2026-03-15 |

## Context

The single e2e/conversation.spec.ts file grew to cover voice, TTS, vocabulary, and sidebar features — too large and impossible to run in isolation.

## Decision

Split E2E tests into one spec file per feature. Shared setup logic lives in helpers.ts only when used by 2+ spec files.

## Consequences

- helpers.ts: startConversation, addFakeAudio, addFakeMediaRecorder, shared constants.
- Stub backend state accumulates across parallel workers — use toBeGreaterThanOrEqual(N) for sidebar counts.
- Stub backend auto-starts as a fixture — no manual server management per test.

## Source Conversation

> **Mar 15 — Sunday — 14:02**
>
> **You:** can we propose a separation in e2e/conversation.spec.ts ?? per feature ??
