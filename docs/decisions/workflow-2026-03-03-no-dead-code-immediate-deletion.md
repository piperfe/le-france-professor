# ADR-0027: No dead code — deleted immediately, no exceptions

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | ⚙️ Development Workflow |
| Date | 2026-03-03 |

## Context

After the big refactor from Vite to Next.js and from throw-based to neverthrow, orphaned code was found: a handleError function imported by nothing except its own test.

## Decision

If production code is unused, delete it immediately — along with its tests. No _unused prefix, no comments, no TODO. Applies to every change without exception.

## Consequences

- Unused imports are banned — TypeScript's noUnusedLocals setting catches these.
- If something is only referenced in tests, delete both the code and the tests.
- Dead code creates confusion about what is actually active.

## Source Conversation

> **Mar 3 — Tuesday — 18:49**
>
> **You:** perfect !!! thank you !!! last check, any unused code with the refactor throw -> neverthrow ??? any that we need to clean up ??? or re write ???
