# ADR-0011: MSW inline per test file — no shared handlers.ts

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🧪 Testing Strategy |
| Date | 2026-03-12 |

## Context

An early implementation used global.fetch = vi.fn() as a low-fidelity mock. A TODO was left to upgrade it. The choice was between nock, shared MSW handlers, or inline MSW per test.

## Decision

Each test file defines its own MSW handlers inline. No shared handlers.ts. MSW intercepts real fetch calls — it is not a mock of the fetch function.

## Consequences

- Each test file is self-contained — readable without cross-referencing another file.
- global.fetch = vi.fn() is banned — use MSW server.use(http.post(...)) instead.
- Handler changes in one test cannot silently break another test.

## Source Conversation

> **Mar 12 — Thursday — 14:31**
>
> **You:** I think I put a /TODO for improving the mocking that we're using in this layer ... pick between nock or MSW that is already in the project ...
