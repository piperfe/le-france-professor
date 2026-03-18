# ADR-0028: Slash command logic goes into a hook when the second command is added

| Field | Value |
|-------|-------|
| Status | Pending |
| Domain | ⚙️ Development Workflow |
| Date | 2026-03-12 |

## Context

The first slash command (/vocabulary) was implemented inline in ChatClient. Adding a second command would duplicate parsing logic.

## Decision

When a second slash command is added, extract command parsing into use-slash-commands.ts hook. The hook owns: detecting the slash prefix, dispatching to handlers, returning updated input state.

## Consequences

- Currently deferred — only /vocabulary exists.
- The hook boundary also raises whether Message is still the right type for command output.
- Reminder saved in project memory to trigger this refactor when the second command arrives.

## Source Conversation

> **Mar 12 — Thursday — 14:18**
>
> **You:** can you put the remminder ?? 'the second command that we'll put in the comoponent we should refactor the logic' ??
