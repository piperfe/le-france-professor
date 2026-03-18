# ADR-0008: SSR guard for browser-only globals via lazy useState initialiser

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | ⚛️ Frontend Patterns |
| Date | 2026-03-09 |

## Context

Next.js renders components on the server. Accessing window, MediaRecorder, or Audio during SSR throws ReferenceError. A hydration mismatch appeared in VoiceInputButton because the useState initialiser ran differently on server vs client.

## Decision

Guard browser globals with: useState(() => typeof window !== "undefined" && ...). This runs once on first render — server returns false, client returns the real value.

## Consequences

- Applies to: matchMedia (pointer: coarse detection), MediaRecorder, Audio.
- Avoids hydration mismatch without suppressHydrationWarning hacks.
- No conditional hooks — the hook always runs, the lazy initialiser handles the guard.

## Source Conversation

> **Mar 9 — Monday — 15:58**
>
> **You:** there is an error that turbo is charging ...
>
> Recoverable Error: Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used a server/client branch...
